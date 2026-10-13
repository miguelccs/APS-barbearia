// ========================================================
// MÓDULO EXCLUSIVO: CRIPTOGRAFIA PARA LOCALSTORAGE
// Padrão: AES-GCM (256-bit) nativo via Web Crypto API
// Zero dependências externas
// ========================================================

const CriptoStorage = (function () {
    // Chave padrão caso o chamador não forneça uma senha específica
    const CHAVE_PADRAO = "barbearia-premium-secret-key-2026";

    // 1. Converte ArrayBuffer para Base64 compacto
    function bufferParaBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // 2. Converte Base64 para Uint8Array
    function base64ParaBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    // 3. Deriva CryptoKey AES-GCM (256 bits) usando SHA-256 do segredo
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
        /**
         * Criptografa objeto, array ou string com AES-GCM
         * Retorna string compacta no formato: "IV_BASE64.DADO_CIFRADO_BASE64"
         */
        async cifrar(dado, segredo = CHAVE_PADRAO) {
            try {
                const enc = new TextEncoder();
                const textoLimpo = typeof dado === 'string' ? dado : JSON.stringify(dado);

                // IV único de 12 bytes para cada cifragem (garante que dados repetidos gerem cifras diferentes)
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

        /**
         * Descriptografa a string cifrada e devolve o dado original já convertido
         */
        async decifrar(payloadCifrado, segredo = CHAVE_PADRAO) {
            try {
                if (!payloadCifrado || typeof payloadCifrado !== 'string' || !payloadCifrado.includes('.')) {
                    return null;
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
                console.error("[CriptoStorage] Falha ao decifrar. Chave incorreta ou dado corrompido:", err);
                return null;
            }
        },

        /**
         * Atalho: Criptografa e grava diretamente no localStorage
         */
        async setItem(chave, valor, segredo = CHAVE_PADRAO) {
            const cifrado = await this.cifrar(valor, segredo);
            localStorage.setItem(chave, cifrado);
            return true;
        },

        /**
         * Atalho: Lê do localStorage e descriptografa automaticamente
         */
        async getItem(chave, valorPadrao = null, segredo = CHAVE_PADRAO) {
            const item = localStorage.getItem(chave);
            if (!item) return valorPadrao;
            const decifrado = await this.decifrar(item, segredo);
            return decifrado !== null ? decifrado : valorPadrao;
        }
    };
})();

// Expõe globalmente caso usado em módulos clássicos
if (typeof window !== 'undefined') {
    window.CriptoStorage = CriptoStorage;
}
