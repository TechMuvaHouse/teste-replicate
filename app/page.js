/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import React, { useState, useRef, useCallback } from "react";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CyberSertaoApp = () => {
  const [currentScreen, setCurrentScreen] = useState("intro");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // const fileInputRef = useRef(null);

  // const handleImageUpload = (e) => {
  //   const file = e.target.files[0];
  //   if (file) {
  //     setSelectedImage(file);
  //     const reader = new FileReader();
  //     reader.onload = (e) => {
  //       setImagePreview(e.target.result);
  //       setCurrentScreen("preview");
  //     };
  //     reader.readAsDataURL(file);
  //     setError(null);
  //     setPrediction(null);
  //   }
  // };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
      setStream(mediaStream);
      setShowCamera(true);
      setCurrentScreen("camera");
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      setError("Erro ao acessar a câmera. Verifique as permissões.");
      alert("Erro ao acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          const file = new File([blob], `foto-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setSelectedImage(file);
          const reader = new FileReader();
          reader.onload = (e) => {
            setImagePreview(e.target.result);
            setCurrentScreen("preview");
          };
          reader.readAsDataURL(file);
          setError(null);
          setPrediction(null);
          stopCamera();
        },
        "image/jpeg",
        0.9
      );
    }
  }, []);

  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    );
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.secure_url;
    } catch (error) {
      throw new Error("Erro ao fazer upload da imagem: " + error.message);
    }
  };

  const processImage = async () => {
    if (!selectedImage) {
      setError("Por favor, selecione uma imagem primeiro.");
      return;
    }
    setIsProcessing(true);
    setCurrentScreen("loading");
    setError(null);
    try {
      const imageUrl = await uploadImageToCloudinary(selectedImage);
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageUrl }),
      });
      let prediction = await response.json();
      if (response.status !== 201) {
        throw new Error(prediction.detail || "Erro ao processar a imagem");
      }
      setPrediction(prediction);
      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed"
      ) {
        await sleep(2000);
        const statusResponse = await fetch("/api/predictions/" + prediction.id);
        prediction = await statusResponse.json();
        if (statusResponse.status !== 200) {
          throw new Error(prediction.detail || "Erro ao verificar status");
        }
        setPrediction(prediction);
      }
      if (prediction.status === "failed") {
        throw new Error("Falha ao processar a imagem. Tente novamente.");
      } else if (prediction.status === "succeeded") {
        const outputImage = Array.isArray(prediction.output)
          ? prediction.output[0]
          : prediction.output;
        setProcessedImage(outputImage);
        setCurrentScreen("result");
      }
    } catch (error) {
      setError(error.message || "Erro inesperado. Tente novamente.");
      alert(`Erro ao processar imagem: ${error.message}`);
      setCurrentScreen("preview");
    } finally {
      setIsProcessing(false);
    }
  };

  const shareImage = async () => {
    if (processedImage) {
      try {
        // Primeiro, vamos baixar a imagem como blob
        const response = await fetch(processedImage, {
          mode: "cors",
          credentials: "omit",
        });
        const blob = await response.blob();

        // Criar um arquivo a partir do blob
        const file = new File([blob], `cyber-avatar-2099-${Date.now()}.jpg`, {
          type: blob.type || "image/jpeg",
        });

        const shareText = "Confira meu avatar criado no Cyber Sertão 2099!";

        // Verificar se o navegador suporta compartilhamento de arquivos
        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          try {
            await navigator.share({
              text: shareText,
              files: [file],
            });
            return;
          } catch (shareError) {
            console.log(
              "Compartilhamento de arquivo falhou, tentando URL:",
              shareError
            );
          }
        }

        // Fallback 1: Compartilhar URL se arquivos não funcionarem
        if (navigator.share) {
          try {
            await navigator.share({
              text: shareText,
              url: processedImage,
            });
            return;
          } catch (shareError) {
            console.log("Compartilhamento de URL falhou:", shareError);
          }
        }

        // Fallback 2: Copiar texto e link para clipboard
        if (navigator.clipboard) {
          try {
            const textToShare = `${shareText}\n\n${processedImage}`;
            await navigator.clipboard.writeText(textToShare);
            alert(
              "Texto e link da imagem copiados para a área de transferência!"
            );
            return;
          } catch (clipboardError) {
            console.log("Clipboard falhou:", clipboardError);
          }
        }

        // Fallback 3: Abrir imagem em nova aba
        window.open(processedImage, "_blank");
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
        alert("Não foi possível compartilhar a imagem. Tente novamente.");
      }
    }
  };

  const downloadImage = async () => {
    if (processedImage) {
      try {
        // Detectar se é mobile
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );

        if (isMobile) {
          // Estratégia para mobile: abrir em nova aba com download sugerido
          try {
            const response = await fetch(processedImage, {
              mode: "cors",
              credentials: "omit",
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Tentar download direto primeiro
            const a = document.createElement("a");
            a.href = url;
            a.download = `cyber-avatar-2099-${Date.now()}.jpg`;
            a.style.display = "none";
            document.body.appendChild(a);

            // Adicionar evento para limpar após o download
            a.addEventListener("click", () => {
              setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              }, 100);
            });

            a.click();

            // Se não funcionar, mostrar instrução para o usuário
            setTimeout(() => {
              if (document.body.contains(a)) {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                // Abrir em nova aba como fallback
                const newWindow = window.open(processedImage, "_blank");
                if (newWindow) {
                  alert(
                    "Para salvar a imagem:\n\n• Android: Toque e segure na imagem, depois selecione 'Salvar imagem'\n• iOS: Toque e segure na Galeria de Fotos'"
                  );
                } else {
                  alert(
                    "Não foi possível abrir a imagem. Verifique se o bloqueador de pop-ups está desabilitado."
                  );
                }
              }
            }, 1000);
          } catch (fetchError) {
            console.error("Erro no fetch mobile:", fetchError);
            // Fallback: abrir em nova aba
            const newWindow = window.open(processedImage, "_blank");
            if (newWindow) {
              alert(
                "Para salvar a imagem:\n\n• Android: Toque e segure na imagem, depois selecione 'Salvar imagem'\n• iOS: Toque e segure na Galeria de Fotos'"
              );
            } else {
              alert(
                "Não foi possível abrir a imagem. Verifique se o bloqueador de pop-ups está desabilitado."
              );
            }
          }
        } else {
          // Estratégia para desktop (mantém a original com melhorias)
          const response = await fetch(processedImage, {
            mode: "cors",
            credentials: "omit",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `cyber-avatar-2099-${Date.now()}.jpg`;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();

          // Limpar após um pequeno delay
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
        }
      } catch (error) {
        console.error("Erro ao fazer download:", error);
        setError("Erro ao fazer download da imagem");

        // Fallback final: abrir em nova aba
        try {
          const newWindow = window.open(processedImage, "_blank");
          if (newWindow) {
            alert(
              "Não foi possível fazer download automático. A imagem foi aberta em nova aba - clique com botão direito e selecione 'Salvar imagem como'"
            );
          } else {
            alert(
              "Não foi possível abrir a imagem. Verifique se o bloqueador de pop-ups está desabilitado."
            );
          }
        } catch (fallbackError) {
          alert(
            "Erro ao abrir imagem. Tente novamente ou verifique sua conexão."
          );
        }
      }
    }
  };

  const resetApp = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setProcessedImage(null);
    setPrediction(null);
    setError(null);
    setIsProcessing(false);
    stopCamera();
    setCurrentScreen("upload");
  };

  const CyberButton = ({
    children,
    onClick,
    className = "",
    variant = "primary",
    disabled = false,
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    const buttonConfig =
      variant === "primary"
        ? {
            defaultImg: "/botao_vazado_rosa.svg",
            hoverImg: "/botao_vazado_verde.svg",
          }
        : {
            defaultImg: "/botao_vazado_verde.svg",
            hoverImg: "/botao_vazado_rosa.svg",
          };

    const currentImg = isHovered
      ? buttonConfig.hoverImg
      : buttonConfig.defaultImg;

    return (
      <div
        className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 ${className} ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        onClick={disabled ? undefined : onClick}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: "clamp(160px, 45vw, 220px)",
          height: "clamp(45px, 10vw, 60px)",
          maxWidth: "50vw",
          minWidth: "160px",
        }}
      >
        <img
          src={currentImg || "/placeholder.svg"}
          alt=""
          className="w-full h-full object-contain select-none pointer-events-none"
          style={{
            transition: "opacity 0.3s ease",
            display: "block",
            backgroundColor: "transparent",
            mixBlendMode: "normal",
          }}
          draggable={false}
        />

        <div
          className="absolute inset-0 flex items-center justify-center w-full h-full"
          style={{
            color: "#000000",
            transition: "none",
            background: "transparent",
            border: "none",
            backgroundColor: "transparent",
          }}
        >
          <div className="flex items-center justify-center w-full h-full font-bold text-xs sm:text-sm md:text-base lg:text-lg">
            <span
              className="tracking-wider whitespace-nowrap select-none text-center"
              style={{
                background: "transparent",
                backgroundColor: "transparent",
                color: "#000000",
                width: "100%",
                textAlign: "center",
              }}
            >
              {children}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const Header = () => (
    <div className="header-section">
      <img
        src="/flecha_diagonal.png"
        alt=""
        className="diagonal-arrow-header"
      />
      <Image
        alt="logo_superior"
        src="/nome_app.png"
        width={300}
        height={150}
        className="w-auto h-auto logo-bleeding"
        priority
      />
    </div>
  );

  // CORREÇÃO: Footer com logo MUVA corrigida
  const Footer = () => (
    <div className="footer-section">
      <div className="logo-muva-container">
        <Image
          alt="logo_muva"
          src="/logo_muva.png"
          width={120}
          height={60}
          className="logo-muva-img"
          priority
        />
        <div className="copyright-text">
          © CyberSertão 2099 - An original project by MUVA House. All rights
          reserved.
        </div>
      </div>
    </div>
  );

  const IntroScreen = ({ setCurrentScreen }) => {
    const [videoReady, setVideoReady] = useState(false);
    const videoRef = useRef(null);

    React.useEffect(() => {
      if (videoRef.current) {
        videoRef.current.muted = true;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }
    }, []);

    const handleVideoReady = () => {
      setVideoReady(true);
    };

    return (
      <div className="screen-layout intro-screen">
        <Header />
        <div className="content-section">
          <img src="/linha_corte.png" alt="" className="linha-corte-img" />

          <div className="relative w-full max-w-2xl aspect-[16/10] md:aspect-[16/12] lg:aspect-[16/14] xl:aspect-[16/16] z-10">
            <video
              ref={videoRef}
              autoPlay
              loop
              playsInline
              onLoadedData={handleVideoReady}
              className="w-full h-full object-cover object-top rounded-lg"
            >
              <source src="/video_loop.mp4" type="video/mp4" />
              <div className="absolute inset-0 text-4xl md:text-6xl lg:text-8xl text-[#212121] font-bold opacity-50 flex items-center justify-center">
                VIDEO
              </div>
            </video>
          </div>
          <div className="intro-button-bleeding">
            <CyberButton
              onClick={() => setCurrentScreen("terms")}
              className="text-xl lg:text-2xl"
            >
              CRIAR AVATAR
            </CyberButton>
          </div>
        </div>
        <Footer />
      </div>
    );
  };

  const screens = {
    intro: () => <IntroScreen setCurrentScreen={setCurrentScreen} />,

    terms: () => (
      <div className="screen-layout">
        <Header />
        <div className="content-section">
          <img src="/linha_corte.png" alt="" className="linha-corte-img" />

          <div className="image-preview-area">
            <div className="image-container terms-container">
              <div className="terms-content text-center">
                <h2 className="text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-6 text-center">
                  TERMOS DE USO — CYBER SERTÃO 2099
                </h2>
                <div className="text-white space-y-4 text-center">
                  <p className="text-lg lg:text-xl">
                    Ao usar este aplicativo, você concorda que:
                  </p>
                  <ul className="space-y-2 text-base lg:text-lg text-white list-none p-0 m-0 text-center">
                    <li>• Suas imagens serão processadas por IA.</li>
                    <li>• Nada será armazenado após o uso.</li>
                    <li>
                      • O conteúdo enviado deve ser de sua autoria ou ter
                      autorização.
                    </li>
                    <li>
                      • É proibido qualquer uso ofensivo, ilegal ou que viole
                      direitos.
                    </li>
                    <li>
                      • O serviço é experimental, sem garantias de funcionamento
                      ou resultado.
                    </li>
                  </ul>
                  <p className="text-white text-sm lg:text-base mt-4 opacity-80 text-center">
                    Esta é uma versão BETA. Sujeita a falhas e mudanças.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="button-bleeding-container">
            <CyberButton
              onClick={() => setCurrentScreen("upload")}
              className="text-xl lg:text-2xl"
            >
              ACEITAR
            </CyberButton>
          </div>
        </div>
        <Footer />
      </div>
    ),

    upload: () => (
      <div className="screen-layout">
        <Header />
        <div className="content-section">
          <img src="/linha_corte.png" alt="" className="linha-corte-img" />
          <div className="image-preview-area">
            <div
              className="image-container terms-container"
              style={{
                boxShadow: "0 0 16px #ff00ff",
                border: "2px solid #ff00ff",
                background: "#212121",
                borderRadius: "16px",
                padding: "1.5rem 1.5rem",
                position: "relative",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              <div style={{ position: "relative", zIndex: 3 }}>
                {/* <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  className="hidden"
                /> */}
                <div className="relative z-10 flex flex-col gap-6 w-full max-w-sm mx-auto items-center justify-center h-full">
                  {/* <CyberButton
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xl lg:text-2xl"
                  >
                    ENVIAR FOTO
                  </CyberButton> */}
                  <CyberButton
                    onClick={startCamera}
                    variant="secondary"
                    className="text-xl lg:text-2xl"
                  >
                    TIRAR FOTO
                  </CyberButton>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    ),

    camera: () => (
      <div className="screen-layout">
        <Header />
        <div className="content-section">
          <img src="/linha_corte.png" alt="" className="linha-corte-img" />
          <div className="image-preview-area">
            <div
              className="image-container terms-container"
              style={{
                boxShadow: "0 0 16px #ff00ff",
                border: "2px solid #ff00ff",
                background: "#212121",
                borderRadius: "16px",
                padding: "0",
                position: "relative",
                maxWidth: "1000px",
                margin: "0 auto",
                minHeight: "320px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                alignItems: "center",
                overflow: "visible",
                width: "100%",
                aspectRatio:
                  typeof window !== "undefined" && window.innerWidth >= 1024
                    ? "16/9"
                    : "4/3",
              }}
            >
              <div
                style={{
                  position: "relative",
                  zIndex: 3,
                  width: "100%",
                  height: "100%",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                }}
              >
                {showCamera && (
                  <>
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        maxWidth: "100%",
                        margin: "0 auto",
                        flex: 1,
                        minHeight: "200px",
                        aspectRatio:
                          typeof window !== "undefined" &&
                          window.innerWidth >= 1024
                            ? "16/9"
                            : "4/3",
                        marginTop:
                          typeof window !== "undefined" &&
                          window.innerWidth < 1024
                            ? "10px"
                            : undefined,
                        marginBottom:
                          typeof window !== "undefined" &&
                          window.innerWidth < 1024
                            ? "0"
                            : undefined,
                      }}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover object-center z-5 rounded-lg"
                        style={{
                          background: "#000",
                          objectPosition: "center 30%",
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div
                          className="relative"
                          style={{ transform: "translateY(15%)" }}
                        >
                          <div className="w-48 h-60 md:w-64 md:h-80 lg:w-80 lg:h-96 border-4 border-[#ff00ff] rounded-full opacity-70"></div>
                          {[
                            "top-left",
                            "top-right",
                            "bottom-left",
                            "bottom-right",
                          ].map((pos, i) => (
                            <div
                              key={i}
                              className={`absolute w-6 h-6 lg:w-8 lg:h-8 border-4 border-[#ff00ff] ${
                                pos === "top-left"
                                  ? "-top-2 -left-2 border-r-0 border-b-0 rounded-tl-lg"
                                  : pos === "top-right"
                                  ? "-top-2 -right-2 border-l-0 border-b-0 rounded-tr-lg"
                                  : pos === "bottom-left"
                                  ? "-bottom-2 -left-2 border-r-0 border-t-0 rounded-bl-lg"
                                  : "-bottom-2 -right-2 border-l-0 border-t-0 rounded-br-lg"
                              }`}
                              style={{ pointerEvents: "none" }}
                            ></div>
                          ))}
                        </div>
                      </div>
                      {/* Botões sobrepostos no mobile */}
                      <div className="lg:hidden absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4 z-20 pointer-events-auto">
                        <CyberButton
                          onClick={capturePhoto}
                          variant="secondary"
                          className="text-lg lg:text-xl"
                        >
                          CAPTURAR
                        </CyberButton>
                        <CyberButton
                          onClick={() => {
                            stopCamera();
                            setCurrentScreen("upload");
                          }}
                          className="text-lg lg:text-xl"
                        >
                          ✕ CANCELAR
                        </CyberButton>
                      </div>
                    </div>
                    {/* Botões abaixo do vídeo no desktop */}
                    <div className="hidden lg:flex flex-row items-center justify-center gap-4 pointer-events-auto mt-4">
                      <CyberButton
                        onClick={capturePhoto}
                        variant="secondary"
                        className="text-lg lg:text-xl"
                      >
                        CAPTURAR
                      </CyberButton>
                      <CyberButton
                        onClick={() => {
                          stopCamera();
                          setCurrentScreen("upload");
                        }}
                        className="text-lg lg:text-xl"
                      >
                        ✕ CANCELAR
                      </CyberButton>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    ),

    preview: () => (
      <div className="screen-layout preview-screen">
        <Header />
        <div className="content-section">
          <img src="/linha_corte.png" alt="" className="linha-corte-img" />

          {/* NOVA ÁREA ESPECÍFICA PARA PREVIEW */}
          <div className="image-preview-area">
            {imagePreview ? (
              <div className="image-container">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Preview da imagem"
                  className="rounded-lg shadow-2xl border-2 border-[#ff00ff]"
                />
              </div>
            ) : (
              <div className="text-white text-center p-4">
                <div className="text-xl mb-2">Erro ao carregar imagem</div>
                <div className="text-sm opacity-75">Tente novamente</div>
              </div>
            )}
          </div>

          {error && (
            <div className="absolute top-4 left-4 right-4 p-4 bg-[#FF0D0D] text-white text-center z-20 rounded">
              {error}
            </div>
          )}
          <div className="button-bleeding-container">
            <CyberButton
              onClick={processImage}
              variant="secondary"
              className="text-lg lg:text-xl"
              disabled={isProcessing}
            >
              {isProcessing ? "PROCESSANDO..." : "CRIAR"}
            </CyberButton>
            <CyberButton onClick={resetApp} className="text-lg lg:text-xl">
              REFAZER
            </CyberButton>
          </div>
        </div>
        <Footer />
      </div>
    ),

    loading: () => (
      <div className="screen-layout">
        <Header />
        <div className="content-section">
          <div className="flex items-center justify-center h-full w-full relative z-10">
            <div className="loading-container-custom">
              <div className="loading-box-custom">
                <div className="loading-circle-custom animate-pulse-custom"></div>
              </div>
              <div
                className="text-center mt-8 space-y-2"
                style={{ color: "#15FF6F" }}
              >
                <div className="text-xl font-bold">HAL 9000 / Thinking...</div>
                <div className="text-base">BETA Test</div>
                <div className="text-base opacity-80">
                  Tempo médio : 1 a 5 minutos
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    ),

    result: () => (
      <div className="screen-layout result-screen">
        <Header />
        <div className="content-section">
          {/* USAR A MESMA ÁREA ESPECÍFICA PARA RESULTADO */}
          <div className="image-preview-area">
            {processedImage && (
              <div className="image-container">
                <img
                  src={processedImage || "/placeholder.svg"}
                  alt="Imagem processada"
                  className="rounded-lg shadow-2xl border-2 border-[#15ff6f]"
                />
              </div>
            )}
          </div>
          <div className="button-bleeding-container">
            <CyberButton
              onClick={shareImage}
              variant="secondary"
              className="text-lg lg:text-xl"
            >
              COMPARTILHAR
            </CyberButton>
            <CyberButton onClick={downloadImage} className="text-lg lg:text-xl">
              DOWNLOAD
            </CyberButton>
          </div>
        </div>
        <Footer />
      </div>
    ),
  };

  return (
    <div className="w-full min-h-screen bg-[#212121]">
      <div className="w-full max-w-md mx-auto bg-[#212121] min-h-screen lg:max-w-full lg:mx-0">
        {screens[currentScreen]?.() || screens.intro()}
      </div>
    </div>
  );
};

export default CyberSertaoApp;
