document.addEventListener('DOMContentLoaded', () => {
    // Como é um module, o DOM já está garantido. Podemos ir direto ao ponto:
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
            // Instancia o validador passando o CONTEÚDO do XML e o CAMINHO para o schema.
            // A biblioteca se encarrega de criar um Web Worker para não travar a página.
            const validator = new Validator(xmlString, schemaUrl);

            // Valida o XML
            const validationErrors = await validator.validate();

            if (validationErrors.length === 0) {
                displayResult('✅ XML válido! Nenhum erro encontrado.', 'success');
            } else {
                let errorMessages = '❌ Erros de validação encontrados:\n\n';
                validationErrors.forEach(error => {
                    // Garante que a mensagem de erro não tenha quebras de linha extras
                    const cleanMessage = error.message?.trim() || 'Erro desconhecido.';
                    errorMessages += `- Linha ${error.line}, Coluna ${error.column}: ${cleanMessage}\n`;
                });
                displayResult(errorMessages, 'error');
            }
        } catch (e) {
            console.error('Erro crítico durante a instanciação ou validação:', e);
            displayResult(`❌ Ocorreu um erro crítico durante a validação:\n\n${e.message}\n\nVerifique o console (F12) para mais detalhes.`, 'error');
        } finally {
            // Reabilita o botão ao final da operação
            validateBtn.disabled = false;
        }
    });

    function displayResult(message, type) {
        resultText.textContent = message;
        // Garante que as classes de status sejam aplicadas corretamente
        resultContainer.className = 'result-container';
        if (type) {
            resultContainer.classList.add(type);
        }
    }
});
