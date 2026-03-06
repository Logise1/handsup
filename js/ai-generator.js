// ============================================
// HandsUp — Mistral AI Exam Generator
// ============================================

const AI = {
    API_KEY: 'evxly62Xv91b752fbnHA2I3HD988C5RT',
    API_URL: 'https://api.mistral.ai/v1/chat/completions',
    MODEL: 'mistral-medium-latest',

    async generateExam(subject, topic, numQuestions = 10, difficulty = 'medium') {
        const difficultyText = {
            easy: 'fácil, con preguntas básicas y directas',
            medium: 'intermedia, con preguntas que requieran comprensión',
            hard: 'difícil, con preguntas que requieran análisis y pensamiento crítico'
        };

        const prompt = `Eres un profesor experto creando exámenes tipo test. Genera un examen de ${numQuestions} preguntas tipo test sobre "${subject}" centrado en el tema "${topic}".

Dificultad: ${difficultyText[difficulty] || difficultyText.medium}

REGLAS:
- Cada pregunta debe tener exactamente 4 opciones (A, B, C, D)
- Solo una opción es correcta
- Las opciones incorrectas deben ser plausibles
- Las preguntas deben ser claras y sin ambigüedad
- Varía la posición de la respuesta correcta

FORMATO DE RESPUESTA (JSON estricto, sin markdown):
{
  "title": "Título del examen",
  "questions": [
    {
      "text": "Texto de la pregunta",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correct": 0
    }
  ]
}

IMPORTANTE: "correct" es el índice (0-3) de la opción correcta. Responde SOLO con el JSON, sin texto adicional ni bloques de código.`;

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: JSON.stringify({
                    model: this.MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'Eres un asistente que genera exámenes educativos en formato JSON. Responde SOLO con JSON válido, sin bloques de código markdown ni texto adicional.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 4000
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API Error: ${response.status} - ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content.trim();

            // Parse JSON from response (handle markdown code blocks)
            let jsonStr = content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }

            // Clean any leading/trailing non-JSON characters
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            }

            const exam = JSON.parse(jsonStr);

            // Validate structure
            if (!exam.questions || !Array.isArray(exam.questions)) {
                throw new Error('Formato de respuesta inválido');
            }

            exam.questions = exam.questions.map((q, i) => ({
                text: q.text || `Pregunta ${i + 1}`,
                options: Array.isArray(q.options) && q.options.length === 4
                    ? q.options
                    : ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
                correct: typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3
                    ? q.correct
                    : 0
            }));

            return exam;
        } catch (error) {
            console.error('AI Generation Error:', error);
            throw error;
        }
    }
};
