document.addEventListener('DOMContentLoaded', () => {
    const validateBtn = document.getElementById('validateBtn');
    const xmlContentInput = document.getElementById('xmlContent');
    const resultContainer = document.getElementById('result');
    const resultText = document.getElementById('result-text');

    const schemaMap = {
        'nacional': 'schemas/nacional/DPS_v1.01.xsd',
        'abrasf': 'schemas/abrasf2.04/schema_nfse_v2-04 - Corrigido.xsd'
    };

    validateBtn.addEventListener('click', async () => {
        const selectedStandard = document.querySelector('input[name="nfse_standard"]:checked').value;
        const schemaUrl = schemaMap[selectedStandard];
        const xmlString = xmlContentInput.value;

        if (!xmlString.trim()) {
            displayResult('Por favor, cole o conteúdo do XML na área de texto.', 'error');
            return;
        }

        validateBtn.disabled = true;
        displayResult('Inicializando engine de validação...', 'loading');

        try {
            // 1. Carrega o texto do XSD antes de abrir o Worker
            const schemaResponse = await fetch(schemaUrl);
            if (!schemaResponse.ok) {
                throw new Error(`Não foi possível carregar o arquivo XSD em: ${schemaUrl}`);
            }
            const xsdString = await schemaResponse.text();

            // 2. Instancia o Web Worker
            const worker = new Worker('xmlvalidate.js');

            // 3. Orquestração de mensagens baseada no estado da Libxml2
            worker.onmessage = (e) => {
                const data = e.data;
                console.log("Mensagem recebida do Worker:", data); // Ajuda a rastrear no F12

                // Padrão Emscripten/xmlvalidate: Aguarda a engine sinalizar que está pronta
                if (data.status === "ready" || data.ready) {
                    displayResult('Processando Schemas XSD...', 'loading');
                    worker.postMessage({ content: xsdString, name: "schema.xsd" });
                    return;
                }

                // Resposta do carregamento do Schema
                if ((data.file === "schema.xsd" && data.loaded) || data.status === "schema_loaded") {
                    displayResult('Validando estrutura do XML...', 'loading');
                    worker.postMessage({ content: xmlString, name: "documento.xml" });
                    return;
                } 

                // Resposta final da validação do XML
                if (data.file === "documento.xml" || data.status === "validated" || data.errors !== undefined) {
                    worker.terminate();

                    const erros = data.errors || [];
                    if (erros.length > 0) {
                        let errorMessages = '❌ Erros de validação encontrados:\n\n';
                        erros.forEach(error => {
                            const cleanMessage = error.message?.trim() || 'Erro de estrutura (XSD).';
                            errorMessages += `- Linha ${error.line || '?'}, Coluna ${error.column || '?'}: ${cleanMessage}\n`;
                        });
                        displayResult(errorMessages, 'error');
                    } else {
                        displayResult('✅ XML válido! Nenhum erro encontrado.', 'success');
                    }
                    validateBtn.disabled = false;
                }
            };

            worker.onerror = (err) => {
                console.error("Erro interno no Worker:", err);
                worker.terminate();
                displayResult(`❌ Erro interno no validador: ${err.message}`, 'error');
                validateBtn.disabled = false;
            };

        } catch (e) {
            console.error('Erro crítico:', e);
            displayResult(`❌ Ocorreu um erro crítico:\n\n${e.message}`, 'error');
            validateBtn.disabled = false;
        }
    });

    function displayResult(message, type) {
        resultText.textContent = message;
        resultContainer.className = 'result-container';
        if (type) {
            resultContainer.classList.add(type);
        }
    }
});
