document.addEventListener('DOMContentLoaded', () => {
    const validateBtn = document.getElementById('validateBtn');
    const xmlContentInput = document.getElementById('xmlContent');
    const resultContainer = document.getElementById('result');
    const resultText = document.getElementById('result-text');

    // Mapeia os modelos aos seus schemas principais
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

        // Desabilita o botão e mostra o status
        validateBtn.disabled = true;
        displayResult('Validando, por favor aguarde...', 'loading');

        try {
            // 1. Buscamos o conteúdo de texto do arquivo XSD selecionado
            const schemaResponse = await fetch(schemaUrl);
            if (!schemaResponse.ok) {
                throw new Error(`Não foi possível carregar o arquivo XSD em: ${schemaUrl}`);
            }
            const xsdString = await schemaResponse.text();

            // 2. Criamos o Web Worker apontando diretamente para o arquivo xmlvalidate.js
            const worker = new Worker('xmlvalidate.js');

            // 3. Monitoramos as respostas enviadas pelo Worker
            worker.onmessage = (e) => {
                const data = e.data;

                // Se o XSD foi carregado com sucesso na memória do WebAssembly
                if (data.file === "schema.xsd" && data.loaded) {
                    // Enviamos o XML para ser validado contra o schema recém-carregado
                    worker.postMessage({ content: xmlString, name: "documento.xml" });
                } 
                // Se recebemos a resposta final da validação do XML
                else if (data.file === "documento.xml") {
                    // Finaliza o worker para liberar memória
                    worker.terminate();

                    // Se vier uma lista de erros e ela contiver itens
                    if (data.errors && data.errors.length > 0) {
                        let errorMessages = '❌ Erros de validação encontrados:\n\n';
                        data.errors.forEach(error => {
                            const cleanMessage = error.message?.trim() || 'Erro de estrutura.';
                            errorMessages += `- Linha ${error.line || '?'}, Coluna ${error.column || '?'}: ${cleanMessage}\n`;
                        });
                        displayResult(errorMessages, 'error');
                    } else {
                        displayResult('✅ XML válido! Nenhum erro encontrado.', 'success');
                    }
                    validateBtn.disabled = false;
                }
            };

            // Trata falhas internas do Worker
            worker.onerror = (err) => {
                worker.terminate();
                throw new Error(`Falha interna no Web Worker: ${err.message}`);
            };

            // 4. Iniciamos o fluxo enviando primeiro o conteúdo do Schema (XSD)
            // A extensão ".xsd" diz à biblioteca para compilar o schema em memória.
            worker.postMessage({ content: xsdString, name: "schema.xsd" });

        } catch (e) {
            console.error('Erro crítico durante a validação:', e);
            displayResult(`❌ Ocorreu um erro crítico durante a validação:\n\n${e.message}\n\nVerifique o console (F12) para mais detalhes.`, 'error');
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
