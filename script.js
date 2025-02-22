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

    // 품질 설정 슬라이더 이벤트
    quality.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value;
    });

    // 드래그 앤 드롭 이벤트
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
            } else {
                showNotification('이미지 파일만 업로드 가능합니다.', 'error');
            }
        });
        convertBtn.disabled = files.length === 0;
    }

    function updateFileList() {
        fileList.innerHTML = '';
        files.forEach((fileObj, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item glass-effect';
            
            const thumbnail = document.createElement('img');
            thumbnail.src = fileObj.preview;
            thumbnail.alt = "Preview";
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            
            const fileName = document.createElement('div');
            fileName.textContent = fileObj.name;
            fileName.style.fontFamily = 'Noto Sans KR, sans-serif';
            
            const status = document.createElement('div');
            status.textContent = '상태: 대기중';
            status.className = 'status-waiting';
            
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-btn';
            removeButton.innerHTML = '<span class="btn-icon">🗑️</span>';
            removeButton.setAttribute('data-index', index);
            removeButton.title = '파일 제거';
            
            fileInfo.appendChild(fileName);
            fileInfo.appendChild(status);
            
            fileItem.appendChild(thumbnail);
            fileItem.appendChild(fileInfo);
            fileItem.appendChild(removeButton);
            
            // 애니메이션 효과 추가
            fileItem.style.opacity = '0';
            fileItem.style.transform = 'translateY(20px)';
            
            fileList.appendChild(fileItem);
            
            // 애니메이션 실행
            setTimeout(() => {
                fileItem.style.opacity = '1';
                fileItem.style.transform = 'translateY(0)';
            }, 50 * index);
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-btn').dataset.index);
                const fileItem = e.target.closest('.file-item');
                
                // 제거 애니메이션
                fileItem.style.opacity = '0';
                fileItem.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    files.splice(index, 1);
                    updateFileList();
                    if (files.length === 0) {
                        convertBtn.disabled = true;
                        downloadAllBtn.style.display = 'none';
                    }
                }, 300);
            });
        });
    }

    convertBtn.addEventListener('click', async () => {
        convertBtn.disabled = true;
        const selectedFormat = outputFormat.value;
        const qualityValue = quality.value / 100;
        const convertedFiles = [];

        // 파일 확장자 매핑
        const formatExtensions = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif'
        };

        for (let i = 0; i < files.length; i++) {
            const fileObj = files[i];
            const fileItem = fileList.children[i];
            const statusDiv = fileItem.querySelector('.file-info div:last-child');
            
            try {
                statusDiv.textContent = '상태: 변환 중...';
                statusDiv.className = 'status-converting';
                
                const convertedBlob = await convertImage(fileObj.preview, selectedFormat, qualityValue);
                const extension = formatExtensions[selectedFormat] || selectedFormat.split('/')[1];
                const newFileName = fileObj.name.replace(/\.[^/.]+$/, '') + '.' + extension;
                
                convertedFiles.push({
                    blob: convertedBlob,
                    fileName: newFileName
                });
                
                statusDiv.textContent = '상태: 변환 완료';
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
            // 다운로드 버튼 애니메이션
            downloadAllBtn.style.opacity = '0';
            downloadAllBtn.style.transform = 'translateY(20px)';
            setTimeout(() => {
                downloadAllBtn.style.opacity = '1';
                downloadAllBtn.style.transform = 'translateY(0)';
            }, 100);
            
            downloadAllBtn.onclick = () => {
                convertedFiles.forEach((file, index) => {
                    setTimeout(() => {
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(file.blob);
                        link.download = file.fileName;
                        link.click();
                    }, index * 100); // 순차적 다운로드
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

    // 알림 표시 함수
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 애니메이션 효과
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // 3초 후 제거
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // 알림 스타일 추가
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
