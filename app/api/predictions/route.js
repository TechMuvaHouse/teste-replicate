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

    // Criar predição usando seu deployment personalizado
    const prediction = await replicate.deployments.predictions.create(
      "techmuvahouse",
      "testeimg2img",
      {
        input: {
          prompt:
            "transform all the people in the photo into dolls, keeping their characteristics. the background of the image remains the same",
          image: image, // URL da imagem
          // Adicione outros parâmetros necessários para seu modelo
          num_inference_steps: 20,
          guidance_scale: 7.5,
          seed: Math.floor(Math.random() * 1000000),
        },
      }
    );

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar predição:", error);
    return NextResponse.json(
      { detail: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
