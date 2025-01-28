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

        // 检查是否是移动端设备
        const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
        
        // 显示图片预览
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            previewContainer.classList.add('active');
            
            // 如果是移动端，显示提示信息
            if (isMobile) {
                exifInfo.innerHTML = `
                    <h3>照片信息</h3>
                    <div style="background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <div style="font-weight: 600; margin-bottom: 8px;">
                            <svg style="width: 20px; height: 20px; fill: #856404; vertical-align: middle; margin-right: 8px;" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            </svg>
                            设备兼容性提示
                        </div>
                        <p>由于移动端浏览器的安全限制，可能无法读取照片的完整信息（尤其是GPS位置信息）。</p>
                        <p style="margin-top: 8px;">建议使用方式：</p>
                        <ul style="margin-left: 20px; margin-top: 5px;">
                            <li>使用电脑浏览器访问本网站</li>
                            <li>或等待我们的APP版本发布</li>
                        </ul>
                    </div>
                `;
            }
        }
        reader.readAsDataURL(file);

        // 读取EXIF信息
        EXIF.getData(file, function() {
            try {
                const dateTime = EXIF.getTag(this, "DateTime");
                const latitude = EXIF.getTag(this, "GPSLatitude");
                const longitude = EXIF.getTag(this, "GPSLongitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                const longRef = EXIF.getTag(this, "GPSLongitudeRef");

                console.log('EXIF数据：', {
                    dateTime,
                    latitude,
                    longitude,
                    latRef,
                    longRef
                });

                let exifHTML = '<h3>照片信息</h3>';

                // 添加浏览器信息提示
                if (/MicroMessenger/i.test(navigator.userAgent)) {
                    exifHTML += '<p style="color: #ff6b6b;">注意：微信浏览器可能无法获取完整的GPS信息，建议使用系统浏览器访问。</p>';
                }

                if (dateTime) {
                    const formattedDate = formatDateTime(dateTime);
                    exifHTML += `<p>拍摄时间：${formattedDate}</p>`;
                }

                if (latitude && longitude) {
                    const lat = convertDMSToDD(latitude, latRef);
                    const lng = convertDMSToDD(longitude, longRef);
                    exifHTML += `<p>拍摄地点坐标：${lat.toFixed(6)}°, ${lng.toFixed(6)}°</p>`;
                    exifHTML += `<p>拍摄地点：等待获取中...</p>`;
                    exifInfo.innerHTML = exifHTML;
                    
                    getAddress(lng, lat).then(result => {
                        if (result) {
                            exifInfo.innerHTML = exifInfo.innerHTML.replace('等待获取中...', result.address);
                        } else {
                            exifInfo.innerHTML = exifInfo.innerHTML.replace('等待获取中...', '地址获取失败');
                        }
                    });
                } else {
                    exifHTML += '<p>未找到GPS信息</p>';
                }

                if (!dateTime && !latitude) {
                    exifHTML += '<p>未找到EXIF信息</p>';
                }

                exifInfo.innerHTML = exifHTML;
            } catch (error) {
                console.error('EXIF数据处理错误：', error);
                exifInfo.innerHTML = '<h3>照片信息</h3><p>读取照片信息时发生错误</p>';
            }
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

    // 修改获取地址的函数
    async function getAddress(lng, lat) {
        try {
            console.log('发送给高德的坐标：', `经度=${lng}, 纬度=${lat}`);
            
            // 检查坐标是否有效
            if (!isValidCoordinate(lng, lat)) {
                console.error('无效的坐标值');
                return null;
            }
            
            const geocoder = new AMap.Geocoder();
            
            const result = await new Promise((resolve) => {
                geocoder.getAddress([lng, lat], (status, result) => {
                    console.log('高德返回状态：', status);
                    console.log('高德返回结果：', result);
                    
                    if (status === 'complete' && result.info === 'OK') {
                        resolve({
                            address: result.regeocode.formattedAddress
                        });
                    } else {
                        console.error('地理编码失败：', status, result);
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

    // 添加坐标验证函数
    function isValidCoordinate(lng, lat) {
        return !isNaN(lng) && !isNaN(lat) && 
               lng >= -180 && lng <= 180 && 
               lat >= -90 && lat <= 90;
    }
}); 