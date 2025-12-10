// Models: Prioritizing Next-Gen models found in user account
const MODELS = [
    "gemini-3-pro-preview",       // User requested this specifically!
    "gemini-2.0-flash",           // Very fast & stable
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-pro",             // Legacy fallback
    "gemini-1.5-flash"
];

window.GeminiService = class GeminiService {
    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key');
        this.genAI = null;

        if (this.apiKey) {
            this.init(this.apiKey);
        }
    }

    init(key) {
        if (!window.GoogleGenerativeAI) {
            console.error("SDK not loaded");
        }

        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        this.genAI = new window.GoogleGenerativeAI(key);
        // We don't init model here anymore, we do it per call to allow fallback
    }

    hasKey() {
        return !!this.apiKey;
    }

    reset() {
        localStorage.removeItem('gemini_api_key');
        this.apiKey = null;
        this.genAI = null;
    }

    async analyze(systemPrompt, userText, imageParts = []) {
        if (!this.genAI) throw new Error("API Key no configurada");

        let errors = [];
        const statusDiv = document.getElementById('resultsArea');

        // Try models in sequence
        for (const modelName of MODELS) {
            try {
                console.log(`Attempting analysis with model: ${modelName}`);

                if (modelName !== MODELS[0]) {
                    statusDiv.innerHTML = `<div class="glass" style="padding: 20px; color: var(--text-muted); text-align: center;">
                        <i data-lucide="loader-2" class="spin"></i><br>
                        Reintentando con: <strong>${modelName}</strong>...
                     </div>`;
                    if (window.lucide) window.lucide.createIcons();
                }

                const model = this.genAI.getGenerativeModel({ model: modelName });

                let parts = [];
                // System instructions as first part for robustness in 1.5
                parts.push({ text: `INSTRUCCIONES DEL SISTEMA:\n${systemPrompt}\n\n---\n\n` });

                if (imageParts.length > 0) {
                    parts = parts.concat(imageParts);
                }

                parts.push({ text: `ANÁLISIS SOLICITADO:\n${userText || "(Analizar documento adjunto)"}` });

                const result = await model.generateContent(parts);
                const response = await result.response;
                return response.text();

            } catch (error) {
                console.warn(`Failed with model ${modelName}:`, error);
                errors.push(`${modelName}: ${error.message}`);
                // Continue to next
            }
        }

        // Return detailed error of the FIRST model (most relevant) + summary
        console.error("All models failed", errors);
        const mainError = errors[0] || "Error desconocido";

        // Check for common issues
        let friendlyMsg = "No se pudo conectar con ningún modelo de Gemini.";
        if (mainError.includes('404')) friendlyMsg += " (Error 404: El modelo no está disponible para esta API Key o Región).";
        if (mainError.includes('400')) friendlyMsg += " (Error 400: Solicitud inválida).";

        throw new Error(`${friendlyMsg}\n\nDetalle técnico: ${mainError}`);
    }

    // Helper to convert File to GenerativePart
    static async fileToPart(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result.split(',')[1];
                resolve({
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type
                    }
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}
