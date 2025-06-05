"use client";

import Image from "next/image";
import React, { useState, useRef, useCallback } from "react";

const CyberSertaoApp = () => {
  const [currentScreen, setCurrentScreen] = useState("intro");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Função para navegar entre telas
  const navigateToScreen = (screen) => {
    setCurrentScreen(screen);
  };

  // Função para lidar com upload de imagem
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
    }
  };

  // Função para iniciar câmera
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
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      alert("Erro ao acessar a câmera. Verifique as permissões.");
    }
  };

  // Função para parar câmera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // Função para capturar foto
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

          stopCamera();
        },
        "image/jpeg",
        0.9
      );
    }
  }, []);

  // Função para processar imagem (simulação)
  const processImage = async () => {
    setIsProcessing(true);
    setCurrentScreen("loading");

    // Simulação do processamento (substitua pela sua API real)
    setTimeout(() => {
      // Para demonstração, vamos usar a mesma imagem
      setProcessedImage(imagePreview);
      setIsProcessing(false);
      setCurrentScreen("result");
    }, 3000);
  };

  // Função para compartilhar
  const shareImage = async () => {
    if (navigator.share && processedImage) {
      try {
        // Converter base64 para blob
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
        // Fallback: download da imagem
        downloadImage();
      }
    } else {
      downloadImage();
    }
  };

  // Função para download da imagem
  const downloadImage = () => {
    if (processedImage) {
      const link = document.createElement("a");
      link.href = processedImage;
      link.download = "cyber-avatar-2099.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Função para resetar aplicação
  const resetApp = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setProcessedImage(null);
    setIsProcessing(false);
    stopCamera();
    setCurrentScreen("upload");
  };

  // Componente de botão customizado
  const CyberButton = ({
    children,
    onClick,
    className = "",
    variant = "primary",
  }) => {
    const baseClasses =
      "relative overflow-hidden font-bold py-4 px-8 rounded-none transition-all duration-300 transform hover:scale-105 border-2";

    let variantClasses = "";
    if (variant === "primary") {
      variantClasses =
        "bg-gradient-to-r from-pink-500 to-purple-600 text-black border-pink-500 hover:bg-gradient-to-r hover:from-black hover:to-gray-900 hover:text-pink-500 hover:border-pink-500";
    } else if (variant === "secondary") {
      variantClasses =
        "bg-gradient-to-r from-green-400 to-green-600 text-black border-green-400 hover:bg-gradient-to-r hover:from-black hover:to-gray-900 hover:text-green-400 hover:border-green-400";
    }

    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${variantClasses} ${className}`}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </button>
    );
  };

  // Tela de introdução com vídeo
  const IntroScreen = () => (
    <div className="min-h-screen flex flex-col bg-black relative overflow-hidden">
      {/* Header */}
      <div className="relative z-20 flex flex-col items-center pt-8 pb-4">
        <Image
          alt="logo_superior"
          src="/logo_muva.png"
          width={400}
          height={200}
          className="w-auto h-auto max-w-[300px] sm:max-w-[400px] lg:max-w-[500px]"
          priority
        />
      </div>

      {/* Área do vídeo - Centralizada */}
      <div className="flex-1 relative bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center overflow-hidden">
        <div className="relative w-full max-w-2xl aspect-video">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover rounded-lg"
          >
            <source src="/video_loop.mp4" type="video/mp4" />
            {/* Fallback caso o vídeo não carregue */}
            <div className="absolute inset-0 text-4xl md:text-6xl lg:text-8xl text-black font-bold opacity-50 flex items-center justify-center">
              VIDEO
            </div>
          </video>
        </div>
      </div>

      {/* Botão Criar Avatar */}
      <div className="relative z-20 p-8 flex justify-center">
        <CyberButton
          onClick={() => navigateToScreen("terms")}
          className="text-xl lg:text-2xl"
        >
          ▷ CRIAR AVATAR
        </CyberButton>
      </div>

      {/* Footer */}
      <div className="relative z-20 p-4 flex justify-center">
        <Image
          alt="logo_muva"
          src="/logo_muva.png"
          width={200}
          height={100}
          className="w-auto h-auto max-w-[150px] sm:max-w-[200px] lg:max-w-[250px]"
        />
      </div>
    </div>
  );

  // Tela de termos e condições
  const TermsScreen = () => (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-4">
        <Image
          alt="logo_superior"
          src="/nome_app.png"
          width={400}
          height={200}
          className="w-auto h-auto max-w-[300px] sm:max-w-[400px] lg:max-w-[500px]"
        />
      </div>

      {/* Área dos termos */}
      <div className="flex-1 bg-purple-800 p-8 overflow-y-auto">
        <h2 className="text-black text-2xl md:text-3xl lg:text-4xl font-bold mb-6 text-center">
          TERMOS E CONDIÇÕES
        </h2>

        <div className="bg-purple-800 text-black space-y-4 max-w-4xl mx-auto">
          <p className="text-lg lg:text-xl">
            Ao utilizar o Cyber Sertão 2099, você concorda com os seguintes
            termos:
          </p>

          <ul className="space-y-2 text-base lg:text-lg text-black bg-purple-800">
            <li className="text-black">
              • Suas imagens serão processadas por inteligência artificial
            </li>
            <li className="text-black">
              • O processamento pode levar de 2 a 5 minutos
            </li>
            <li className="text-black">
              • Não armazenamos suas imagens após o processamento
            </li>
            <li className="text-black">
              • Use apenas imagens próprias ou com autorização
            </li>
            <li className="text-black">
              • O serviço é fornecido sem garantias
            </li>
            <li className="text-black">
              • Proibido uso para conteúdo ofensivo ou ilegal
            </li>
          </ul>

          <p className="text-black text-sm lg:text-base mt-4 opacity-80 bg-purple-800">
            Esta é uma versão BETA do aplicativo. Funcionalidades podem variar.
          </p>
        </div>
      </div>

      {/* Botão aceitar */}
      <div className="p-8 flex justify-center">
        <CyberButton
          onClick={() => navigateToScreen("upload")}
          className="text-xl lg:text-2xl"
        >
          ▷ ACEITAR
        </CyberButton>
      </div>

      {/* Footer */}
      <div className="p-4 flex justify-center">
        <Image
          alt="logo_muva"
          src="/logo_muva.png"
          width={200}
          height={100}
          className="w-auto h-auto max-w-[150px] sm:max-w-[200px] lg:max-w-[250px]"
        />
      </div>

      <div className="text-center text-green-400 text-xs lg:text-sm pb-4">
        © CyberSertão 2099 - An original project by MUVA House. All rights
        reserved.
      </div>
    </div>
  );

  // Tela de upload/captura
  const UploadScreen = () => (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-4">
        <Image
          alt="logo_superior"
          src="/nome_app.png"
          width={400}
          height={200}
          className="w-auto h-auto max-w-[300px] sm:max-w-[400px] lg:max-w-[500px]"
        />
      </div>

      {/* Área dos botões */}
      <div className="flex-1 bg-gradient-to-b from-purple-600 to-purple-800 flex flex-col justify-center items-center space-y-8 p-8">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          ref={fileInputRef}
          className="hidden"
        />

        <CyberButton
          onClick={() => fileInputRef.current?.click()}
          className="text-xl lg:text-2xl w-full max-w-md lg:max-w-lg"
        >
          ▷ ENVIAR FOTO
        </CyberButton>

        <CyberButton
          onClick={startCamera}
          variant="secondary"
          className="text-xl lg:text-2xl w-full max-w-md lg:max-w-lg"
        >
          ▷ TIRAR FOTO
        </CyberButton>
      </div>

      {/* Footer */}
      <div className="p-4 flex justify-center">
        <Image
          alt="logo_muva"
          src="/logo_muva.png"
          width={200}
          height={100}
          className="w-auto h-auto max-w-[150px] sm:max-w-[200px] lg:max-w-[250px]"
        />
      </div>

      <div className="text-center text-green-400 text-xs lg:text-sm pb-4">
        © CyberSertão 2099 - An original project by MUVA House. All rights
        reserved.
      </div>
    </div>
  );

  // Tela da câmera
  const CameraScreen = () => (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-center pt-4 pb-2 relative z-10">
        <Image
          alt="logo_superior"
          src="/nome_app.png"
          width={400}
          height={200}
          className="w-auto h-auto max-w-[300px] sm:max-w-[400px] lg:max-w-[500px]"
        />
      </div>

      {/* Área da câmera */}
      <div className="flex-1 relative bg-gradient-to-b from-blue-400 to-blue-600 overflow-hidden">
        {showCamera && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Sobreposição com guia facial */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Oval principal */}
                <div className="w-48 h-60 md:w-64 md:h-80 lg:w-80 lg:h-96 border-4 border-pink-500 rounded-full opacity-70"></div>

                {/* Cantos */}
                <div className="absolute -top-2 -left-2 w-6 h-6 lg:w-8 lg:h-8 border-l-4 border-t-4 border-pink-500 rounded-tl-lg"></div>
                <div className="absolute -top-2 -right-2 w-6 h-6 lg:w-8 lg:h-8 border-r-4 border-t-4 border-pink-500 rounded-tr-lg"></div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 lg:w-8 lg:h-8 border-l-4 border-b-4 border-pink-500 rounded-bl-lg"></div>
                <div className="absolute -bottom-2 -right-2 w-6 h-6 lg:w-8 lg:h-8 border-r-4 border-b-4 border-pink-500 rounded-br-lg"></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Botões */}
      <div className="p-4 flex justify-center space-x-4 relative z-10">
        <CyberButton
          onClick={capturePhoto}
          variant="secondary"
          className="text-lg lg:text-xl"
        >
          ▷ CAPTURAR
        </CyberButton>

        <CyberButton
          onClick={() => {
            stopCamera();
            navigateToScreen("upload");
          }}
          className="text-lg lg:text-xl"
        >
          ✕ CANCELAR
        </CyberButton>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  // Tela de preview
  const PreviewScreen = () => (
    <div className="min-h-screen flex flex-col bg-black relative">
      {/* Imagem de fundo centralizada */}
      <div className="absolute inset-0 flex items-center justify-center">
        {imagePreview && (
          <div className="relative w-full h-full">
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              className="object-cover object-center"
              style={{
                objectPosition: "center center",
              }}
            />
            {/* Overlay escuro para melhor legibilidade */}
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          </div>
        )}
      </div>

      {/* Header sobreposto */}
      <div className="relative z-10 flex flex-col items-center pt-8 pb-4">
        <Image
          alt="logo_superior"
          src="/nome_app.png"
          width={400}
          height={200}
          className="w-auto h-auto max-w-[300px] sm:max-w-[400px] lg:max-w-[500px]"
        />
      </div>

      {/* Spacer para centralizar conteúdo */}
      <div className="flex-1"></div>

      {/* Botões */}
      <div className="relative z-10 p-8 flex justify-center space-x-4">
        <CyberButton
          onClick={processImage}
          variant="secondary"
          className="text-xl lg:text-2xl"
        >
          ▷ GOSTOU?
        </CyberButton>

        <CyberButton onClick={resetApp} className="text-xl lg:text-2xl">
          ▷ DE NOVO
        </CyberButton>
      </div>

      {/* Footer */}
      <div className="relative z-10 p-4 flex justify-center">
        <Image
          alt="logo_muva"
          src="/logo_muva.png"
          width={200}
          height={100}
          className="w-auto h-auto max-w-[150px] sm:max-w-[200px] lg:max-w-[250px]"
        />
      </div>
    </div>
  );

  // Tela de loading
  const LoadingScreen = () => (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-4">
        <Image
          alt="logo_superior"
          src="/nome_app.png"
          width={400}
          height={200}
          className="w-auto h-auto max-w-[300px] sm:max-w-[400px] lg:max-w-[500px]"
        />
      </div>

      {/* Área de loading */}
      <div className="flex-1 bg-gradient-to-b from-purple-600 to-purple-800 flex flex-col justify-center items-center">
        {/* Spinner circular */}
        <div className="relative w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 mb-8">
          <div className="absolute inset-0 border-8 border-pink-500 rounded-full animate-spin border-t-transparent"></div>
          <div
            className="absolute inset-4 border-4 border-purple-300 rounded-full animate-spin border-b-transparent"
            style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
          ></div>
          <div className="absolute inset-8 w-16 h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 bg-pink-500 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 md:w-6 md:h-6 lg:w-8 lg:h-8 bg-purple-800 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-green-400 text-lg md:text-xl lg:text-2xl font-bold mb-2">
            FASE BETA / LOADING AI THINKING
          </div>
          <div className="text-green-400 text-base md:text-lg lg:text-xl">
            Tempo médio 1 minuto.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 flex justify-center">
        <Image
          alt="logo_muva"
          src="/logo_muva.png"
          width={200}
          height={100}
          className="w-auto h-auto max-w-[150px] sm:max-w-[200px] lg:max-w-[250px]"
        />
      </div>
    </div>
  );

  // Tela de resultado
  const ResultScreen = () => (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-4">
        <Image
          alt="logo_superior"
          src="/nome_app.png"
          width={400}
          height={200}
          className="w-auto h-auto max-w-[300px] sm:max-w-[400px] lg:max-w-[500px]"
        />
      </div>

      {/* Área da imagem processada */}
      <div className="flex-1 bg-gradient-to-b from-purple-600 to-purple-800 relative p-8">
        {processedImage && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="relative max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
              <Image
                src={processedImage}
                alt="Imagem processada"
                width={400}
                height={600}
                className="w-full h-auto object-cover rounded-lg shadow-2xl"
              />
              {/* Efeito cyberpunk */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-20 animate-pulse"></div>
            </div>
          </div>
        )}
      </div>

      {/* Botão compartilhar */}
      <div className="p-8 flex justify-center">
        <CyberButton
          onClick={shareImage}
          variant="secondary"
          className="text-xl lg:text-2xl"
        >
          ▷ COMPARTILHAR
        </CyberButton>
      </div>

      {/* Footer */}
      <div className="p-4 flex justify-center">
        <Image
          alt="logo_muva"
          src="/logo_muva.png"
          width={200}
          height={100}
          className="w-auto h-auto max-w-[150px] sm:max-w-[200px] lg:max-w-[250px]"
        />
      </div>
    </div>
  );

  // Renderização da tela atual
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case "intro":
        return <IntroScreen />;
      case "terms":
        return <TermsScreen />;
      case "upload":
        return <UploadScreen />;
      case "camera":
        return <CameraScreen />;
      case "preview":
        return <PreviewScreen />;
      case "loading":
        return <LoadingScreen />;
      case "result":
        return <ResultScreen />;
      default:
        return <IntroScreen />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-black">
      {/* Container mobile-first que se expande para desktop */}
      <div className="w-full max-w-md mx-auto bg-black min-h-screen lg:max-w-full lg:mx-0">
        {renderCurrentScreen()}
      </div>
    </div>
  );
};

export default CyberSertaoApp;
