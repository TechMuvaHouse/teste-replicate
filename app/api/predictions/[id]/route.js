import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function GET(request, context) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { detail: "ID da predição é obrigatório" },
        { status: 400 }
      );
    }

    const prediction = await replicate.predictions.get(id);

    if (prediction?.error) {
      return NextResponse.json({ detail: prediction.error }, { status: 500 });
    }

    return NextResponse.json(prediction);
  } catch (error) {
    console.error("Erro ao buscar predição:", error);
    return NextResponse.json(
      { detail: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
