const axios = require('axios');

/**
 * SapAiCoreProvider - Bridge to SAP AI Core Generative AI Hub
 * Handles OAuth2 authentication and multimodal requests (GPT-4o).
 */
class SapAiCoreProvider {
    constructor() {
        this.clientId = process.env.SAP_AICORE_CLIENT_ID;
        this.clientSecret = process.env.SAP_AICORE_CLIENT_SECRET;
        this.authUrl = process.env.SAP_AICORE_AUTH_URL;
        this.baseUrl = process.env.SAP_AICORE_BASE_URL;
        this.deploymentId = process.env.SAP_AICORE_DEPLOYMENT_ID;
        this.resourceGroup = process.env.SAP_AICORE_RESOURCE_GROUP || 'default';
        
        this.accessToken = null;
        this.tokenExpiry = 0;
    }

    /**
     * Obtains an OAuth2 token from SAP BTP
     */
    async getAccessToken() {
        const now = Date.now();
        if (this.accessToken && now < this.tokenExpiry) {
            return this.accessToken;
        }

        console.log("🔐 [SAP AI Core] Solicitando nuevo token de acceso...");
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', this.clientId);
            params.append('client_secret', this.clientSecret);

            const response = await axios.post(this.authUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            this.accessToken = response.data.access_token;
            // Guardar con margen de 1 minuto
            this.tokenExpiry = now + (response.data.expires_in * 1000) - 60000;
            return this.accessToken;
        } catch (error) {
            const errorMsg = error.response?.data?.error_description || error.message;
            throw new Error(`Error de autenticación en SAP BTP: ${errorMsg}`);
        }
    }

    /**
     * Sends a multimodal prompt to the deployment
     * @param {string} prompt - The text prompt
     * @param {string} imageBase64 - Image in Base64 (PNG)
     */
    async analyzeImage(prompt, imageBase64) {
        if (!this.deploymentId) {
            throw new Error("SAP_AICORE_DEPLOYMENT_ID no configurado.");
        }

        const token = await this.getAccessToken();
        const url = `${this.baseUrl}/v2/inference/deployments/${this.deploymentId}/chat/completions?api-version=2023-05-15`;

        const payload = {
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 300
        };

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'AI-Resource-Group': this.resourceGroup,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            const detail = error.response?.data?.error?.message || error.message;
            if (error.response?.status === 404) {
                throw new Error(`404 Not Found: Verifica que el Deployment ID '${this.deploymentId}' exista en el Resource Group '${this.resourceGroup}'.`);
            }
            throw new Error(`Error en Inferencia AI Core: ${detail}`);
        }
    }
}

module.exports = new SapAiCoreProvider();
