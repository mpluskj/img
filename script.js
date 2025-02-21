document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const convertBtn = document.getElementById('convertBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const outputFormat = document.getElementById('outputFormat');
    const quality = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    
    let files = [];

    // 품질 슬라이더 이벤트
    quality.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value;
    });

    // 드래그 앤 드롭 이벤트
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#f0f0f0';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '';
        handleFiles(e.dataTransfer.files);
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(newFiles) {
        Array.from(newFiles).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const fileObj = {
                        file: file,
                        preview: e.target.result,
                        name: file.name
                    };
                    files.push(fileObj);
                    updateFileList();
                }
                reader.readAsDataURL(file);
            }
        });
        convertBtn.disabled = false;
    }

    function updateFileList() {
        fileList.innerHTML = '';
        files.forEach((fileObj, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <img src="${fileObj.preview}" alt="Preview">
                <div class="file-info">
                    <div>${fileObj.name}</div>
                    <div>상태: 대기중</div>
                </div>
                <button class="remove-btn" data-index="${index}">제거</button>
            `;
            fileList.appendChild(fileItem);
        });

        // 제거 버튼 이벤트 리스너
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                files.splice(index, 1);
                updateFileList();
                if (files.length === 0) {
                    convertBtn.disabled = true;
                    downloadAllBtn.style.display = 'none';
                }
            });
        });
    }

    convertBtn.addEventListener('click', async () => {
        convertBtn.disabled = true;
        const selectedFormat = outputFormat.value;
        const qualityValue = quality.value / 100;
        const convertedFiles = [];

        for (let i = 0; i < files.length; i++) {
            const fileObj = files[i];
            const fileItem = fileList.children[i];
            const statusDiv = fileItem.querySelector('.file-info div:last-child');
            
            try {
                statusDiv.textContent = '상태: 변환 중...';
                const convertedBlob = await convertImage(fileObj.preview, selectedFormat, qualityValue);
                const extension = selectedFormat.split('/')[1];
                const newFileName = fileObj.name.replace(/\.[^/.]+$/, '') + '.' + extension;
                
                convertedFiles.push({
                    blob: convertedBlob,
                    fileName: newFileName
                });
                
                statusDiv.textContent = '상태: 변환 완료';
                fileItem.style.backgroundColor = '#e8f5e9';
            } catch (error) {
                statusDiv.textContent = '상태: 변환 실패';
                fileItem.style.backgroundColor = '#ffebee';
                console.error('변환 오류:', error);
            }
        }

        if (convertedFiles.length > 0) {
            downloadAllBtn.style.display = 'block';
            downloadAllBtn.onclick = () => {
                convertedFiles.forEach(file => {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(file.blob);
                    link.download = file.fileName;
                    link.click();
                });
            };
        }
        
        convertBtn.disabled = false;
    });

    async function convertImage(src, format, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('이미지 변환 실패'));
                        }
                    },
                    format,
                    quality
                );
            };
            img.onerror = () => reject(new Error('이미지 로드 실패'));
            img.src = src;
        });
    }
});