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
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setCurrentScreen("preview");
      };
      reader.readAsDataURL(file);
      setError(null);
      setPrediction(null);
    }
  };

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
    if (navigator.share && processedImage) {
      try {
        const response = await fetch(processedImage);
        const blob = await response.blob();
        const file = new File([blob], "cyber-avatar.jpg", {
          type: "image/jpeg",
        });
        await navigator.share({
          title: "Meu Avatar Cyber Sertão 2099",
          text: "Confira meu avatar criado no Cyber Sertão 2099!",
          files: [file],
        });
      } catch (error) {
        downloadImage();
      }
    } else {
      downloadImage();
    }
  };

  const downloadImage = async () => {
    if (processedImage) {
      try {
        const response = await fetch(processedImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cyber-avatar-2099-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        setError("Erro ao fazer download da imagem");
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
    showIcon = true,
  }) => {
    const baseClasses =
      "relative overflow-hidden font-bold py-0 px-3 rounded-none transition-all duration-300 transform hover:scale-105 inline-block";
    const variantClasses =
      variant === "primary"
        ? "bg-[#ff00ff] text-[#15ff6f] hover:bg-[#15ff6f] hover:text-[#ff00ff]"
        : "bg-[#15ff6f] text-[#ff00ff] hover:bg-[#ff00ff] hover:text-[#15ff6f]";

    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${variantClasses} ${className}`}
      >
        <span className="relative z-10 flex items-center justify-start gap-0.5 text-base md:text-lg lg:text-xl xl:text-2xl pl-1 whitespace-nowrap break-words w-full justify-center">
          {showIcon && (
            <Image
              src="/chevron-down.svg"
              alt="chevron"
              width={32}
              height={32}
              className="w-8 h-8 md:w-14 md:h-16 lg:w-16 lg:h-18 flex-shrink-0"
              style={{
                filter: "brightness(0) saturate(100%) invert(100%)",
              }}
            />
          )}
          <span className="flex-1 tracking-wider text-ellipsis overflow-hidden">
            {children}
          </span>
        </span>
      </button>
    );
  };

  const Header = () => (
    <div className="flex flex-col items-center pt-8 pb-4">
      <Image
        alt="logo_superior"
        src="/nome_app.png"
        width={600}
        height={300}
        className="w-auto h-auto max-w-[90vw] sm:max-w-[600px] lg:max-w-[700px] logo-superior-mobile"
        priority
      />
    </div>
  );

  const Footer = ({ hideCopyright = false }) => (
    <>
      <div className="pb-6 pt-4 flex justify-center">
        <Image
          alt="logo_muva"
          src="/logo_muva.png"
          width={200}
          height={100}
          className="w-auto h-auto max-w-[170px] sm:max-w-[200px] lg:max-w-[160px] xl:max-w-[140px] 2xl:max-w-[120px] 3xl:max-w-[96px]"
        />
      </div>
      {!hideCopyright && (
        <div className="text-center text-green-400 text-xs lg:text-sm">
          © CyberSertão 2099 - An original project by MUVA House. All rights
          reserved.
        </div>
      )}
    </>
  );

  // Novo componente para a tela de introdução
  const IntroScreen = ({ setCurrentScreen }) => {
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const videoRef = useRef(null);

    React.useEffect(() => {
      if (videoRef.current) {
        videoRef.current.muted = true;
        // Força o vídeo a tentar dar play ao carregar (corrige autoplay bloqueado após reload)
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {}); // Silencia erros de autoplay
        }
      }
      setIsAudioEnabled(false); // Garante que o estado do botão seja resetado
      // Remover o reset de setVideoReady(false) para não esconder o botão após reload
    }, []);

    const toggleAudio = async () => {
      if (videoRef.current) {
        try {
          if (!isAudioEnabled) {
            videoRef.current.muted = false;
            await videoRef.current.play();
            setIsAudioEnabled(true);
          } else {
            videoRef.current.muted = true;
            setIsAudioEnabled(false);
          }
        } catch (error) {
          console.error("Erro ao controlar áudio:", error);
        }
      }
    };

    const handleVideoReady = () => {
      setVideoReady(true);
    };

    return (
      <div className="min-h-screen flex flex-col bg-[#212121] relative overflow-hidden">
        <div className="relative z-20">
          <Header />
        </div>
        <div className="flex-1 relative bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center overflow-hidden">
          <div className="relative w-full max-w-2xl aspect-video">
            <video
              ref={videoRef}
              autoPlay
              loop
              playsInline
              onLoadedData={handleVideoReady}
              className="w-full h-full object-cover"
            >
              <source src="/video_loop.mp4" type="video/mp4" />
              <div className="absolute inset-0 text-4xl md:text-6xl lg:text-8xl text-[#212121] font-bold opacity-50 flex items-center justify-center">
                VIDEO
              </div>
            </video>
            {/* Botão de áudio apenas com o ícone */}
            {videoReady && (
              <button
                onClick={toggleAudio}
                className={`absolute top-4 right-4 z-20 bg-[#212121] bg-opacity-70 text-white p-3 rounded-full hover:bg-opacity-90 transition-all border-2 border-[#ff00ff] ${
                  isAudioEnabled ? "border-[#15ff6f] text-[#15ff6f]" : ""
                }`}
                title={isAudioEnabled ? "Desativar áudio" : "Ativar áudio"}
              >
                {isAudioEnabled ? (
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.816a1 1 0 011.617.816zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.816a1 1 0 011.617.816zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="relative z-20 p-2 flex justify-center">
          <CyberButton
            onClick={() => setCurrentScreen("terms")}
            className="text-xl lg:text-2xl"
          >
            CRIAR AVATAR
          </CyberButton>
        </div>
        <div className="relative z-20 pb-8 pt-4 flex justify-center">
          <Image
            alt="logo_muva"
            src="/logo_muva.png"
            width={200}
            height={100}
            className="w-auto h-auto max-w-[170px] sm:max-w-[200px] lg:max-w-[160px] xl:max-w-[140px] 2xl:max-w-[120px] 3xl:max-w-[96px]"
          />
        </div>
      </div>
    );
  };

  const screens = {
    intro: () => <IntroScreen setCurrentScreen={setCurrentScreen} />,
    terms: () => (
      <div className="min-h-screen flex flex-col bg-[#212121]">
        <Header />
        <div className="flex-1 bg-[#7B0DFF] p-8 overflow-y-auto">
          <h2 className="text-black text-2xl md:text-3xl lg:text-4xl font-bold mb-6 text-center">
            TERMOS DE USO — CYBER SERTÃO 2099
          </h2>
          <div className="bg-[#7B0DFF] text-black space-y-4 max-w-4xl mx-auto">
            <p className="text-lg lg:text-xl">
              Ao usar este aplicativo, você concorda que:
            </p>
            <ul className="space-y-2 text-base lg:text-lg text-black bg-[#7B0DFF]">
              <li>• Suas imagens serão processadas por IA.</li>
              <li>• Nada será armazenado após o uso.</li>
              <li>
                • O conteúdo enviado deve ser de sua autoria ou ter autorização.
              </li>
              <li>
                • É proibido qualquer uso ofensivo, ilegal ou que viole
                direitos.
              </li>
              <li>
                • O serviço é experimental, sem garantias de funcionamento ou
                resultado.
              </li>
            </ul>
            <p className="text-black text-sm lg:text-base mt-4 opacity-80 bg-[#7B0DFF]">
              Esta é uma versão BETA. Sujeita a falhas e mudanças.
            </p>
          </div>
        </div>
        <div className="p-2 flex justify-center">
          <CyberButton
            onClick={() => setCurrentScreen("upload")}
            className="text-xl lg:text-2xl"
          >
            ACEITAR
          </CyberButton>
        </div>
        <Footer />
      </div>
    ),

    upload: () => (
      <div className="min-h-screen flex flex-col bg-[#212121]">
        <Header />
        <div className="flex-1 bg-[#7B0DFF] flex flex-col justify-center items-center space-y-8 p-8">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
            <CyberButton
              onClick={() => fileInputRef.current?.click()}
              className="text-xl lg:text-2xl w-full"
            >
              ENVIAR FOTO
            </CyberButton>
            <CyberButton
              onClick={startCamera}
              variant="secondary"
              className="text-xl lg:text-2xl w-full"
            >
              TIRAR FOTO
            </CyberButton>
          </div>
        </div>
        <Footer />
      </div>
    ),

    camera: () => (
      <div className="fixed inset-0 bg-[#212121] z-50 flex flex-col">
        <div className="flex flex-col items-center pt-4 pb-2 relative z-10">
          <Header />
        </div>
        <div className="flex-1 relative bg-[#0C4FE8] overflow-hidden">
          {showCamera && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-48 h-60 md:w-64 md:h-80 lg:w-80 lg:h-96 border-4 border-[#ff00ff] rounded-full opacity-70"></div>
                  {["top-left", "top-right", "bottom-left", "bottom-right"].map(
                    (pos, i) => (
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
                      ></div>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="p-4 flex justify-center space-x-4 relative z-10">
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
            showIcon={false}
          >
            ✕ CANCELAR
          </CyberButton>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    ),

    preview: () => (
      <div className="min-h-screen flex flex-col bg-[#212121]">
        <div className="relative z-10">
          <Header />
        </div>
        <div className="flex-1 bg-[#7B0DFF] flex items-center justify-center p-4">
          {imagePreview ? (
            <div className="relative max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl w-full">
              <img
                src={imagePreview}
                alt="Preview da imagem"
                className="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-2xl border-2 border-[#ff00ff]"
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
          <div className="p-4 bg-[#FF0D0D] text-white text-center">{error}</div>
        )}
        <div className="p-2 flex justify-center space-x-4 relative z-10">
          <CyberButton
            onClick={processImage}
            variant="secondary"
            className="text-xl lg:text-2xl"
            disabled={isProcessing}
          >
            {isProcessing ? "PROCESSANDO..." : "CRIAR"}
          </CyberButton>
          <CyberButton onClick={resetApp} className="text-xl lg:text-2xl">
            REFAZER
          </CyberButton>
        </div>
        <div className="relative z-10">
          <Footer hideCopyright />
        </div>
      </div>
    ),

    loading: () => (
      <div className="min-h-screen flex flex-col bg-[#212121]">
        <Header />
        <div className="flex-1 bg-[#7B0DFF] flex flex-col justify-center items-center">
          <div className="relative w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 mb-8">
            <div className="absolute inset-0 border-8 border-[#ff00ff] rounded-full animate-spin border-t-transparent"></div>
            <div
              className="absolute inset-4 border-4 border-purple-300 rounded-full animate-spin border-b-transparent"
              style={{
                animationDirection: "reverse",
                animationDuration: "0.8s",
              }}
            ></div>
            <div className="absolute inset-8 w-16 h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 bg-[#ff00ff] rounded-full flex items-center justify-center">
              <div className="w-4 h-4 md:w-6 md:h-6 lg:w-8 lg:h-8 bg-[#7B0DFF] rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-[#15ff6f] text-lg md:text-xl lg:text-2xl font-bold mb-2">
              FASE BETA / LOADING AI THINKING
            </div>
            <div className="text-[#15ff6f] text-base md:text-lg lg:text-xl">
              Tempo médio 1-2 minutos.
            </div>
            {error && (
              <div className="text-red-400 text-base md:text-lg lg:text-xl mt-4">
                {error}
              </div>
            )}
          </div>
        </div>
        <Footer hideCopyright />
      </div>
    ),

    result: () => (
      <div className="min-h-screen flex flex-col bg-[#212121]">
        <Header />
        <div className="flex-1 bg-[#7B0DFF] flex items-center justify-center p-4">
          {processedImage && (
            <div className="relative max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl w-full">
              <img
                src={processedImage}
                alt="Imagem processada"
                className="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-2xl border-2 border-[#15ff6f]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff00ff] to-transparent opacity-20 animate-pulse rounded-lg"></div>
            </div>
          )}
        </div>
        <div className="p-8 flex justify-center space-x-4">
          <CyberButton
            onClick={shareImage}
            variant="secondary"
            className="text-xl lg:text-2xl"
          >
            COMPARTILHAR
          </CyberButton>
          <CyberButton onClick={resetApp} className="text-xl lg:text-2xl">
            NOVA FOTO
          </CyberButton>
        </div>
        <Footer hideCopyright />
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
