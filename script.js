document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const convertBtn = document.getElementById('convertBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const resetBtn = document.getElementById('resetBtn');
    const outputFormat = document.getElementById('outputFormat');
    const quality = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    
    // 파일 크기 제한 상수 설정 (단위: bytes)
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const MIN_FILE_SIZE = 1 * 1024; // 1KB
    
    let files = [];

    quality.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value;
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.transform = 'scale(1.02)';
        dropZone.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.transform = 'scale(1)';
        dropZone.style.backgroundColor = '';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.transform = 'scale(1)';
        dropZone.style.backgroundColor = '';
        handleFiles(e.dataTransfer.files);
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // 초기화 함수
    function resetAll() {
        files = [];
        updateFileList();
        downloadAllBtn.style.display = 'none';
        resetBtn.style.display = 'none';
        showNotification('모든 파일이 초기화되었습니다.', 'info');
    }

    // 초기화 버튼 이벤트 리스너
    resetBtn.addEventListener('click', resetAll);

    function handleFiles(newFiles) {
        if (!files) {
            files = [];
        }

        const filePromises = Array.from(newFiles).map(file => {
            return new Promise((resolve) => {
                // 파일 크기 검증
                if (file.size > MAX_FILE_SIZE) {
                    showNotification(`${file.name}: 파일 크기가 20MB를 초과합니다.`, 'error');
                    resolve(null);
                    return;
                }

                if (file.size < MIN_FILE_SIZE) {
                    showNotification(`${file.name}: 파일 크기가 너무 작습니다. (최소 1KB)`, 'error');
                    resolve(null);
                    return;
                }

                if (!file.type.startsWith('image/')) {
                    showNotification(`${file.name}: 이미지 파일만 업로드 가능합니다.`, 'error');
                    resolve(null);
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    const fileObj = {
                        file: file,
                        preview: e.target.result,
                        name: file.name,
                        size: file.size
                    };
                    resolve(fileObj);
                };

                reader.onerror = function() {
                    showNotification(`${file.name}: 파일 읽기 실패`, 'error');
                    resolve(null);
                };

                reader.readAsDataURL(file);
            });
        });

        Promise.all(filePromises).then(fileObjects => {
            const validFiles = fileObjects.filter(obj => obj !== null);
            files = files.concat(validFiles);
            updateFileList();
            convertBtn.disabled = files.length === 0;

            if (validFiles.length > 0) {
                showNotification(`${validFiles.length}개의 파일이 추가되었습니다.`, 'success');
            }
        });
    }

    function updateFileList() {
        fileList.innerHTML = '';
        if (!files || files.length === 0) {
            convertBtn.disabled = true;
            downloadAllBtn.style.display = 'none';
            resetBtn.style.display = 'none';
            return;
        }

        files.forEach((fileObj, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item glass-effect';
            
            const thumbnail = document.createElement('img');
            thumbnail.src = fileObj.preview;
            thumbnail.alt = "Preview";
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            
            const fileName = document.createElement('div');
            fileName.innerHTML = `
                <span>${fileObj.name}</span>
                <span class="file-size">(${formatFileSize(fileObj.size)})</span>
            `;
            fileName.style.fontFamily = 'Noto Sans KR, sans-serif';
            
            const status = document.createElement('div');
            status.textContent = '상태: 대기중';
            status.className = 'status-waiting';
            
            fileInfo.appendChild(fileName);
            fileInfo.appendChild(status);
            
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-btn';
            removeButton.innerHTML = '<span class="btn-icon">🗑️</span>';
            removeButton.setAttribute('data-index', index);
            removeButton.title = '파일 제거';
            
            fileItem.appendChild(thumbnail);
            fileItem.appendChild(fileInfo);
            fileItem.appendChild(removeButton);
            
            fileItem.style.opacity = '0';
            fileItem.style.transform = 'translateY(20px)';
            
            fileList.appendChild(fileItem);
            
            setTimeout(() => {
                fileItem.style.opacity = '1';
                fileItem.style.transform = 'translateY(0)';
            }, 50 * index);
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-btn').dataset.index);
                const fileItem = e.target.closest('.file-item');
                
                fileItem.style.opacity = '0';
                fileItem.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    files.splice(index, 1);
                    updateFileList();
                }, 300);
            });
        });

        convertBtn.disabled = files.length === 0;
    }

    convertBtn.addEventListener('click', async () => {
        convertBtn.disabled = true;
        const selectedFormat = outputFormat.value;
        const qualityValue = quality.value / 100;
        const convertedFiles = [];

        const formatExtensions = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif'
        };

        const formatDisplayNames = {
            'image/jpeg': 'JPG',
            'image/png': 'PNG',
            'image/webp': 'WebP',
            'image/gif': 'GIF'
        };

        for (let i = 0; i < files.length; i++) {
            const fileObj = files[i];
            const fileItem = fileList.children[i];
            const statusDiv = fileItem.querySelector('.file-info div:last-child');
            
            try {
                statusDiv.textContent = '상태: 변환 중...';
                statusDiv.className = 'status-converting';
                
                const convertedBlob = await convertImage(fileObj.preview, selectedFormat, qualityValue);
                const extension = formatExtensions[selectedFormat];
                const formatDisplayName = formatDisplayNames[selectedFormat];
                const newFileName = fileObj.name.replace(/\.[^/.]+$/, '') + '.' + extension;
                
                convertedFiles.push({
                    blob: convertedBlob,
                    fileName: newFileName
                });
                
                statusDiv.textContent = `상태: ${formatDisplayName}로 변환 완료`;
                statusDiv.className = 'status-success';
                fileItem.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
            } catch (error) {
                statusDiv.textContent = '상태: 변환 실패';
                statusDiv.className = 'status-error';
                fileItem.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                console.error('변환 오류:', error);
            }
        }

        if (convertedFiles.length > 0) {
            downloadAllBtn.style.display = 'block';
            resetBtn.style.display = 'block';
            
            [downloadAllBtn, resetBtn].forEach(btn => {
                btn.style.opacity = '0';
                btn.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    btn.style.opacity = '1';
                    btn.style.transform = 'translateY(0)';
                }, 100);
            });
            
            downloadAllBtn.onclick = () => {
                convertedFiles.forEach((file, index) => {
                    setTimeout(() => {
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(file.blob);
                        link.download = file.fileName;
                        link.click();
                    }, index * 100);
                });
                showNotification('다운로드가 시작되었습니다.', 'success');
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

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            z-index: 1000;
        }
        
        .notification.success {
            background-color: var(--success-color);
        }
        
        .notification.error {
            background-color: var(--error-color);
        }
        
        .notification.info {
            background-color: var(--primary-color);
        }
    `;
    document.head.appendChild(style);
});