"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
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

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      setError("Erro ao acessar a câmera. Verifique as permissões.");
      console.error("Erro ao acessar câmera:", err);
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
          reader.onload = (e) => setImagePreview(e.target.result);
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
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.secure_url;
    } catch (error) {
      throw new Error("Erro ao fazer upload da imagem: " + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      setError("Por favor, selecione uma imagem primeiro.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const imageUrl = await uploadImageToCloudinary(selectedImage);

      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageUrl,
        }),
      });

      let prediction = await response.json();

      if (response.status !== 201) {
        setError(prediction.detail || "Erro ao processar a imagem");
        setIsProcessing(false);
        return;
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
          setError(prediction.detail || "Erro ao verificar status");
          setIsProcessing(false);
          return;
        }

        console.log({ prediction });
        setPrediction(prediction);
      }

      if (prediction.status === "failed") {
        setError("Falha ao processar a imagem. Tente novamente.");
      } else if (prediction.status === "succeeded") {
        setShowModal(true);
      }
    } catch (err) {
      setError(err.message || "Erro inesperado. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `imagem-modificada-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError("Erro ao fazer download da imagem");
    }
  };

  const resetForm = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setPrediction(null);
    setError(null);
    setShowModal(false);
    stopCamera();
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 container max-w-4xl mx-auto p-3 sm:p-5">
        <h1 className="py-4 sm:py-6 text-center font-bold text-2xl sm:text-3xl text-gray-300">
          MUVA + Replicate
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          {/* Upload de Imagem e Tirar Foto */}
          <div className="mb-4 sm:mb-6 text-center">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg cursor-pointer transition-colors transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto"
              >
                Enviar Imagem
              </label>

              <button
                onClick={startCamera}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg transition-colors transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto"
              >
                Tirar Foto
              </button>
            </div>
          </div>

          {/* Modal da Câmera Melhorado */}
          {showCamera && (
            <div className="camera-modal-overlay">
              <div className="camera-modal-container">
                {/* Header */}
                <div className="camera-modal-header">
                  <h3 className="text-lg sm:text-xl font-bold">
                    Posicione seu rosto dentro da marcação
                  </h3>
                  <button
                    onClick={stopCamera}
                    className="text-white hover:text-gray-300 text-2xl font-bold transition-colors"
                  >
                    ×
                  </button>
                </div>

                {/* Container do Vídeo com Sobreposição */}
                <div className="camera-modal-video-container">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-modal-video"
                  />

                  {/* Sobreposição com Guia Facial */}
                  <div className="camera-modal-overlay-guide">
                    <div className="face-guide-oval">
                      {/* Cantos do oval */}
                      <div className="face-guide-corner top-left"></div>
                      <div className="face-guide-corner top-right"></div>
                      <div className="face-guide-corner bottom-left"></div>
                      <div className="face-guide-corner bottom-right"></div>
                    </div>
                  </div>
                </div>

                {/* Botões Estilizados */}
                <div className="camera-modal-buttons">
                  <button
                    onClick={capturePhoto}
                    className="camera-button camera-button-capture"
                  >
                    <span>📸</span>
                    Capturar
                  </button>
                  <button
                    onClick={stopCamera}
                    className="camera-button camera-button-cancel"
                  >
                    <span>✕</span>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Canvas oculto para captura */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Preview da Imagem e Botão de Processar */}
          {imagePreview && (
            <div className="mb-4 sm:mb-6 text-center">
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="relative w-full max-w-xs sm:max-w-md">
                  <Image
                    src={imagePreview}
                    alt="Preview da imagem"
                    width={400}
                    height={400}
                    className="rounded-lg shadow-md object-cover w-full h-auto"
                  />
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
              >
                {isProcessing ? "Processando..." : "Transformar Imagem"}
              </button>
            </div>
          )}

          {/* Indicador de Progresso */}
          {isProcessing && (
            <div className="mb-4 sm:mb-6">
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-center">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-700 mr-2 sm:mr-3"></div>
                  <span className="text-sm sm:text-base">
                    BETA: Processando sua imagem, tempo média 2 a 5 minutos...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Exibição de Erros */}
          {error && (
            <div className="mb-4 sm:mb-6 bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded">
              <strong>Erro:</strong>{" "}
              <span className="text-sm sm:text-base">{error}</span>
            </div>
          )}

          {/* Status da Predição */}
          {prediction && !showModal && (
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Status:{" "}
                <span className="font-semibold capitalize">
                  {prediction.status}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Resultado Melhorado */}
      {showModal &&
        prediction &&
        prediction.output &&
        prediction.status === "succeeded" && (
          <div className="result-modal-overlay">
            <div className="result-modal-container">
              {/* Header do Modal */}
              <div className="result-modal-header">
                <h3 className="text-lg sm:text-2xl font-bold text-gray-800">
                  Imagem Transformada!
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Conteúdo do Modal */}
              <div className="result-modal-content">
                <div className="w-full max-w-md">
                  <Image
                    src={prediction.output[prediction.output.length - 1]}
                    alt="Imagem processada"
                    width={500}
                    height={500}
                    className="rounded-lg shadow-lg object-cover w-full h-auto"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="result-modal-buttons">
                  <button
                    onClick={() =>
                      handleDownload(
                        prediction.output[prediction.output.length - 1]
                      )
                    }
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    Download da Imagem
                  </button>
                  <button
                    onClick={resetForm}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    Nova Imagem
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
