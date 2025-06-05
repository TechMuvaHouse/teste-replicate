// app/api/process-image/route.js
import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { detail: "Imagem é obrigatória" },
        { status: 400 }
      );
    }

    console.log("Iniciando processamento da imagem...");

    // Verificar se a imagem é base64 ou URL
    let imageInput = image;

    // Se for base64, você pode precisar fazer upload para um serviço de hospedagem
    // ou usar diretamente se o modelo aceitar base64
    if (image.startsWith("data:image/")) {
      // Para base64, o Replicate geralmente precisa de uma URL
      // Você pode usar Cloudinary, AWS S3, ou outro serviço
      console.log("Imagem recebida em base64, convertendo...");

      // Opção 1: Upload temporário (recomendado)
      // imageInput = await uploadToTempStorage(image);

      // Opção 2: Usar base64 diretamente (nem todos os modelos suportam)
      imageInput = image;
    }

    // Criar predição usando seu deployment personalizado
    const prediction = await replicate.deployments.predictions.create(
      "techmuvahouse", // seu username
      "testeimg2img-epicrealism", // nome do seu deployment
      {
        input: {
          prompt:
            "cyberpunk futuristic portrait, neon lights, digital art, high quality, detailed",
          image: imageInput,
          negative_prompt: "blurry, low quality, distorted, deformed",
          num_inference_steps: 25,
          guidance_scale: 7.5,
          strength: 0.8, // Para img2img, controla o quanto a imagem original influencia
          seed: Math.floor(Math.random() * 1000000),
        },
      }
    );

    console.log("Predição criada:", prediction.id);

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar predição:", error);

    // Log mais detalhado do erro
    if (error.response) {
      console.error("Resposta do erro:", error.response.data);
    }

    return NextResponse.json(
      {
        detail: "Erro interno do servidor",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Função auxiliar para upload temporário (exemplo com Cloudinary)
async function uploadToTempStorage(base64Image) {
  try {
    // Remove o prefixo data:image/...;base64,
    const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");

    // Usando Cloudinary como exemplo (configure suas credenciais)
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: base64Image,
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        folder: "cyber-sertao-temp",
        resource_type: "auto",
      }),
    });

    const result = await response.json();

    if (result.secure_url) {
      return result.secure_url;
    } else {
      throw new Error("Falha no upload da imagem");
    }
  } catch (error) {
    console.error("Erro no upload temporário:", error);
    throw error;
  }
}
