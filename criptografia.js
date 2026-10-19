// ========================================================
// SCRIPT NOVO: CRIPTOGRAFIA
// Padrão usado: AES-GCM (256-bit) nativo via Web Crypto API
// ========================================================

const CriptoStorage = (function () {
    const CHAVE_PADRAO = "barbearia-premium-secret-key-2026";

    // UTILITÁRIO: Converte ArrayBuffer para Base64 compacto
    // Serve para: Converter dados binários para texto que possa ser armazenado no localStorage
    function bufferParaBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // UTILITÁRIO: Converte Base64 para Uint8Array
    // Serve para: Converter texto Base64 em dados binários que podem ser descriptografados
    function base64ParaBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    // UTILITÁRIO: Deriva CryptoKey AES-GCM (256 bits) usando SHA-256 do segredo
    // Serve para: Gerar a chave de criptografia/descriptografia
    // AES exige chave binária de ESTRITAMENTE 256 bits (32 bytes)
    async function obterChave(segredo) {
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest("SHA-256", enc.encode(segredo));
        return crypto.subtle.importKey(
            "raw",
            hash,
            { name: "AES-GCM" },
            false,
            ["encrypt", "decrypt"]
        );
    }

    return {
        // Criptografa objeto, array ou string com AES-GCM
        // Retorna string compacta no formato: "IV_BASE64.DADO_CIFRADO_BASE64"
        async cifrar(dado, segredo = CHAVE_PADRAO) {
            try {
                const enc = new TextEncoder();
                const textoLimpo = typeof dado === 'string' ? dado : JSON.stringify(dado);

                // IV único de 12 bytes por operação
                // O IV é obrigatório porque o AES-GCM é um algoritmo de criptografia simétrica
                // O IV garante que mesmo com a mesma chave, cada operação de criptografia produza um resultado diferente
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const chave = await obterChave(segredo);

                const dadoCifrado = await crypto.subtle.encrypt(
                    { name: "AES-GCM", iv: iv },
                    chave,
                    enc.encode(textoLimpo)
                );

                return `${bufferParaBase64(iv)}.${bufferParaBase64(dadoCifrado)}`;
            } catch (err) {
                console.error("[CriptoStorage] Erro ao criptografar:", err);
                throw err;
            }
        },

        // Descriptografa e converte de volta para objeto/string
        // Possui fallback transparente para dados legados não criptografados (de preferência não é para cair nele)
        async decifrar(payloadCifrado, segredo = CHAVE_PADRAO) {
            try {
                if (!payloadCifrado || typeof payloadCifrado !== 'string') {
                    return null;
                }

                // Fallback para dado legado em texto puro (sem ponto separador de Base64)
                if (!payloadCifrado.includes('.')) {
                    try {
                        return JSON.parse(payloadCifrado);
                    } catch {
                        return payloadCifrado;
                    }
                }

                const [ivB64, dataB64] = payloadCifrado.split('.');
                const iv = base64ParaBuffer(ivB64);
                const dadoCifrado = base64ParaBuffer(dataB64);
                const chave = await obterChave(segredo);

                const dec = new TextDecoder();
                const dadoDecifrado = await crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: iv },
                    chave,
                    dadoCifrado
                );

                const textoOriginal = dec.decode(dadoDecifrado);
                try {
                    return JSON.parse(textoOriginal);
                } catch {
                    return textoOriginal;
                }
            } catch (err) {
                // Fallback gracioso caso seja JSON não criptografado antigo (feito para testar sem limpar cache)
                try {
                    return JSON.parse(payloadCifrado);
                } catch {
                    console.error("[CriptoStorage] Falha ao decifrar dados:", err);
                    return null;
                }
            }
        },

        async setItem(chave, valor, segredo = CHAVE_PADRAO) {
            const cifrado = await this.cifrar(valor, segredo);
            localStorage.setItem(chave, cifrado);
            return true;
        },

        async getItem(chave, valorPadrao = null, segredo = CHAVE_PADRAO) {
            const item = localStorage.getItem(chave);
            if (!item) return valorPadrao;
            const decifrado = await this.decifrar(item, segredo);
            return decifrado !== null ? decifrado : valorPadrao;
        }
    };
})();

if (typeof window !== 'undefined') {
    window.CriptoStorage = CriptoStorage;
}
