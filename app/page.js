"use client";

import { useState } from "react";
import Image from "next/image";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
      // Upload da imagem para Cloudinary
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

      // Polling para verificar o status da predição
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
  };

  return (
    <div className="container max-w-4xl mx-auto p-5">
      <h1 className="py-6 text-center font-bold text-3xl text-gray-300">
        Transformador de Imagens IA
      </h1>

      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Upload de Imagem - Simplificado */}
        <div className="mb-6 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg cursor-pointer transition-colors transform hover:scale-105"
          >
            📤 Enviar Imagem
          </label>
        </div>

        {/* Preview da Imagem e Botão de Processar */}
        {imagePreview && (
          <div className="mb-6 text-center">
            <div className="flex justify-center mb-4">
              <Image
                src={imagePreview}
                alt="Preview da imagem"
                width={400}
                height={400}
                className="rounded-lg shadow-md object-cover"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processando..." : "🎨 Transformar Imagem"}
            </button>
          </div>
        )}

        {/* Indicador de Progresso */}
        {isProcessing && (
          <div className="mb-6">
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded text-center">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700 mr-3"></div>
                Processando sua imagem... Isso pode levar alguns minutos.
              </div>
            </div>
          </div>
        )}

        {/* Exibição de Erros */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Erro:</strong> {error}
          </div>
        )}

        {/* Status da Predição */}
        {prediction && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Status:{" "}
              <span className="font-semibold capitalize">
                {prediction.status}
              </span>
            </p>
          </div>
        )}

        {/* Resultado */}
        {prediction &&
          prediction.output &&
          prediction.status === "succeeded" && (
            <div className="mt-6 text-center">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                Imagem Transformada:
              </h3>
              <div className="flex flex-col items-center">
                <Image
                  src={prediction.output[prediction.output.length - 1]}
                  alt="Imagem processada"
                  width={500}
                  height={500}
                  className="rounded-lg shadow-lg object-cover mb-4"
                />
                <div className="flex gap-4">
                  <button
                    onClick={() =>
                      handleDownload(
                        prediction.output[prediction.output.length - 1]
                      )
                    }
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    📥 Download da Imagem
                  </button>
                  <button
                    onClick={resetForm}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    🔄 Nova Imagem
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
