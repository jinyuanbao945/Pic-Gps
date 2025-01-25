document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const imageInput = document.getElementById('imageInput');
    const preview = document.getElementById('preview');
    const exifInfo = document.getElementById('exifInfo');
    const previewContainer = document.querySelector('.preview-container');

    // 处理文件拖放
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007AFF';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#E5E5E5';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#E5E5E5';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 处理文件选择
    imageInput.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件！');
            return;
        }

        // 显示图片预览
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            previewContainer.classList.add('active');
        }
        reader.readAsDataURL(file);

        // 读取EXIF信息
        EXIF.getData(file, function() {
            const dateTime = EXIF.getTag(this, "DateTime");
            const latitude = EXIF.getTag(this, "GPSLatitude");
            const longitude = EXIF.getTag(this, "GPSLongitude");
            const latRef = EXIF.getTag(this, "GPSLatitudeRef");
            const longRef = EXIF.getTag(this, "GPSLongitudeRef");

            let exifHTML = '<h3>照片信息</h3>';

            if (dateTime) {
                // 格式化时间显示
                const formattedDate = formatDateTime(dateTime);
                exifHTML += `<p>拍摄时间：${formattedDate}</p>`;
            }

            if (latitude && longitude) {
                const lat = convertDMSToDD(latitude, latRef);
                const lng = convertDMSToDD(longitude, longRef);
                exifHTML += `<p>拍摄地点坐标：${lat.toFixed(6)}°, ${lng.toFixed(6)}°</p>`;
                exifHTML += `<p>拍摄地点：等待获取中...</p>`;
                exifInfo.innerHTML = exifHTML;
                
                // 调用高德地图API获取地址
                getAddress(lng, lat).then(result => {
                    if (result) {
                        const newExifHTML = exifInfo.innerHTML.replace('等待获取中...', result.address);
                        exifInfo.innerHTML = newExifHTML;
                    } else {
                        const newExifHTML = exifInfo.innerHTML.replace('等待获取中...', '地址获取失败');
                        exifInfo.innerHTML = newExifHTML;
                    }
                });
            }

            if (!dateTime && !latitude) {
                exifHTML += '<p>未找到EXIF信息</p>';
            }

            exifInfo.innerHTML = exifHTML;
        });
    }

    // 将经纬度从度分秒格式转换为十进制格式
    function convertDMSToDD(dms, ref) {
        const degrees = dms[0];
        const minutes = dms[1];
        const seconds = dms[2];
        
        let dd = degrees + minutes/60 + seconds/3600;
        if (ref === "S" || ref === "W") {
            dd = dd * -1;
        }
        return dd;
    }

    // 格式化时间的函数
    function formatDateTime(dateTimeStr) {
        // EXIF时间格式通常为 "YYYY:MM:DD HH:MM:SS"
        const [date, time] = dateTimeStr.split(' ');
        const [year, month, day] = date.split(':');
        const [hour, minute, second] = time.split(':');
        
        // 转换为12小时制
        let period = '上午';
        let hour12 = parseInt(hour);
        
        if (hour12 >= 12) {
            period = '下午';
            if (hour12 > 12) {
                hour12 -= 12;
            }
        }
        if (hour12 === 0) {
            hour12 = 12;
        }
        
        return `${year}年${month}月${day}日 ${period}${hour12}点${minute}分${second}秒`;
    }

    // 修改获取地址的函数 - 本地开发版本
    async function getAddress(lng, lat) {
        try {
            console.log('发送给高德的坐标：', `经度=${lng}, 纬度=${lat}`);
            
            // 创建地理编码器实例
            const geocoder = new AMap.Geocoder();
            
            // 使用Promise包装高德地图的回调
            const result = await new Promise((resolve) => {
                geocoder.getAddress([lng, lat], (status, result) => {
                    console.log('高德返回状态：', status);
                    console.log('高德返回结果：', result);
                    
                    if (status === 'complete' && result.info === 'OK') {
                        resolve({
                            address: result.regeocode.formattedAddress
                        });
                    } else {
                        resolve(null);
                    }
                });
            });
            
            return result;
        } catch (error) {
            console.error('获取地址失败，详细错误：', error);
            return null;
        }
    }
}); 