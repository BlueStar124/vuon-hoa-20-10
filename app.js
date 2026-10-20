/**
 * VƯỜN HOA 20/10 - MAIN APPLICATION LOGIC
 * Hỗ trợ URL Parameter & Tạo Link Tặng Riêng Biệt Cho Nhiều Người (Sẵn sàng Vercel)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo vườn hoa Canvas và bộ phát nhạc
  const garden = new FlowerGarden('gardenCanvas');
  const romanticAudio = new RomanticAudio();

  // Dữ liệu mặc định
  let state = {
    recipient: 'Người Thương',
    sender: 'Chàng trai IT',
    caption: 'Nụ cười tỏa nắng',
    photoUrl: '',
    song: 'the_pool',
    wish: 'Nhân ngày Phụ nữ Việt Nam 20/10, chúc bạn luôn rạng ngời, tươi thắm và xinh đẹp như những đóa hoa đang bung nở. Mong rằng mỗi ngày trôi qua đều mang đến cho bạn thật nhiều niềm vui, bình yên và hạnh phúc trọn vẹn!'
  };

  // Mẫu lời chúc gợi ý
  const wishPresets = {
    crush: {
      recipient: 'Em Yêu',
      sender: 'Anh',
      caption: 'Người con gái anh thương',
      wish: 'Nhân ngày 20/10, chúc em luôn rạng rỡ, xinh tươi như hoa và luôn cảm nhận được sự ngọt ngào, ấm áp mỗi ngày bên anh. Yêu em nhiều!'
    },
    colleague: {
      recipient: 'Chị Em Đồng Nghiệp',
      sender: 'Team Anh Em IT',
      caption: 'Bông hồng công sở',
      wish: 'Chúc toàn thể các bóng hồng của công ty ngày 20/10 nhận được cơn mưa hoa và quà, luôn trẻ trung, nhiệt huyết và công việc hanh thông thuận lợi!'
    },
    mom: {
      recipient: 'Mẹ Yêu',
      sender: 'Con của Mẹ',
      caption: 'Người phụ nữ tuyệt vời nhất',
      wish: 'Con kính chúc Mẹ ngày 20/10 luôn mạnh khỏe, an vui và bình yên. Cảm ơn Mẹ đã luôn hy sinh và là điểm tựa yêu thương ấm áp nhất của cuộc đời con!'
    },
    sister: {
      recipient: 'Chị / Em Gái',
      sender: 'Người Anh/Em thương mến',
      caption: 'Công chúa nhỏ của nhà',
      wish: 'Chúc người phụ nữ tuyệt vời của gia đình ngày 20/10 ngập tràn nụ cười, luôn xinh tươi, may mắn và gặt hái thật nhiều thành công nhé!'
    }
  };

  // Elements
  const displayRecipient = document.getElementById('displayRecipient');
  const displaySender = document.getElementById('displaySender');
  const wishTextEl = document.getElementById('wishText');
  const wishCard = document.getElementById('wishCard');
  const minimizeBtn = document.getElementById('minimizeBtn');
  const audioToggle = document.getElementById('audioToggle');
  const audioLabel = document.getElementById('audioLabel');
  const playlistToggleBtn = document.getElementById('playlistToggleBtn');
  const playlistPopup = document.getElementById('playlistPopup');
  const playlistItems = document.querySelectorAll('.playlist-item[data-track]');
  const customAudioUpload = document.getElementById('customAudioUpload');
  const customTrackTitle = document.getElementById('customTrackTitle');

  // Polaroid Photo elements
  const polaroidWrapper = document.getElementById('polaroidWrapper');
  const recipientPhoto = document.getElementById('recipientPhoto');
  const photoInput = document.getElementById('photoInput');
  const polaroidCaption = document.getElementById('polaroidCaption');

  const bloomMoreBtn = document.getElementById('bloomMoreBtn');
  const shareToolbarBtn = document.getElementById('shareToolbarBtn');
  const clearBtn = document.getElementById('clearBtn');
  const captureBtn = document.getElementById('captureBtn');
  const toastNotification = document.getElementById('toastNotification');

  // Modal elements
  const openModalBtn = document.getElementById('openModalBtn');
  const customModal = document.getElementById('customModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const saveModalBtn = document.getElementById('saveModalBtn');
  const copyShareLinkBtn = document.getElementById('copyShareLinkBtn');
  const inputRecipient = document.getElementById('inputRecipient');
  const inputSender = document.getElementById('inputSender');
  const inputCaption = document.getElementById('inputCaption');
  const inputPhotoUrl = document.getElementById('inputPhotoUrl');
  const inputWish = document.getElementById('inputWish');
  const quickTags = document.querySelectorAll('.quick-tag');

  // ================= 1. XỬ LÝ URL PARAMETERS (TỰ ĐỘNG CÁ NHÂN HÓA CHO TỪNG NGƯỜI) =================
  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const isPersonalizedCard = params.has('card') ||
      ['to', 'from', 'msg', 'wish', 'caption', 'photo', 'img', 'song', 'music']
        .some((key) => params.has(key));

    document.body.classList.toggle('personalized-card', isPersonalizedCard);

    // 1. Kiểm tra gói dữ liệu mã hóa Base64 ?card=...
    const cardData = params.get('card');
    if (cardData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(cardData)))));
        Object.assign(state, decoded);
        return;
      } catch (e) {
        console.warn('Không thể giải mã tham số card:', e);
      }
    }

    // 2. Kiểm tra các tham số URL tường minh dạng ?to=...&from=...&msg=...
    if (params.get('to')) state.recipient = params.get('to');
    if (params.get('from')) state.sender = params.get('from');
    if (params.get('msg') || params.get('wish')) state.wish = params.get('msg') || params.get('wish');
    if (params.get('caption')) state.caption = params.get('caption');
    if (params.get('photo') || params.get('img')) state.photoUrl = params.get('photo') || params.get('img');
    if (params.get('song') || params.get('music')) state.song = params.get('song') || params.get('music');

    // 3. Khôi phục ảnh đã tải lên máy nếu không có link ảnh từ URL
    if (state.photoUrl) {
      recipientPhoto.src = state.photoUrl;
    } else {
      const savedPhoto = localStorage.getItem('user2010Photo');
      if (savedPhoto) {
        recipientPhoto.src = savedPhoto;
      }
    }
  }

  parseUrlParams();

  // Nạp bài hát được chỉ định
  if (state.song && romanticAudio.playlist[state.song]) {
    romanticAudio.loadTrack(state.song);
    playlistItems.forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-track') === state.song);
    });
  }

  // ================= 2. HIỆU ỨNG ĐÁNH CHỮ TYPEWRITER =================
  let typewriterTimeout = null;

  function runTypewriter(text, speed = 25) {
    if (typewriterTimeout) clearTimeout(typewriterTimeout);
    wishTextEl.textContent = '';
    let index = 0;

    function typeChar() {
      if (index < text.length) {
        wishTextEl.textContent += text.charAt(index);
        index++;
        typewriterTimeout = setTimeout(typeChar, speed + (Math.random() * 15 - 5));
      }
    }
    typeChar();
  }

  function updateDisplay() {
    displayRecipient.textContent = state.recipient;
    displaySender.textContent = 'Gửi trao từ: ' + state.sender;
    polaroidCaption.textContent = state.caption;
    if (state.photoUrl) {
      recipientPhoto.src = state.photoUrl;
    }
    runTypewriter(state.wish);
  }

  updateDisplay();

  // ================= 3. ĐỔI ẢNH POLAROID =================
  polaroidWrapper.addEventListener('click', () => {
    photoInput.click();
  });

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        recipientPhoto.src = dataUrl;
        state.photoUrl = ''; // Xóa link online nếu chọn file cục bộ
        try {
          localStorage.setItem('user2010Photo', dataUrl);
        } catch (err) {
          console.warn('LocalStorage limit:', err);
        }
        showToast('Đã cập nhật ảnh kỷ niệm thành công!');
      };
      reader.readAsDataURL(file);
    }
  });

  // ================= 4. ĐIỀU KHIỂN ÂM NHẠC & PLAYLIST =================
  function updateAudioUI(isPlaying) {
    if (isPlaying) {
      audioToggle.classList.add('playing');
      audioLabel.textContent = 'Đang Phát';
    } else {
      audioToggle.classList.remove('playing');
      audioLabel.textContent = 'Bật Nhạc';
    }
  }

  audioToggle.addEventListener('click', () => {
    const isPlaying = romanticAudio.toggle();
    updateAudioUI(isPlaying);
    const track = romanticAudio.playlist[romanticAudio.currentTrack];
    showToast(isPlaying ? `Đang phát: ${track ? track.title : 'Nhạc Lãng Mạn'}` : 'Đã tạm dừng phát nhạc');
  });

  playlistToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playlistPopup.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!playlistPopup.contains(e.target) && e.target !== playlistToggleBtn) {
      playlistPopup.classList.remove('open');
    }
  });

  playlistItems.forEach(item => {
    item.addEventListener('click', () => {
      const trackKey = item.getAttribute('data-track');

      playlistItems.forEach(el => el.classList.remove('active'));
      const uploadItem = document.querySelector('.upload-item');
      if (uploadItem) uploadItem.classList.remove('active');

      item.classList.add('active');
      state.song = trackKey;
      romanticAudio.loadTrack(trackKey);
      romanticAudio.play();
      updateAudioUI(true);

      const track = romanticAudio.playlist[trackKey];
      showToast(`Đã chuyển sang: ${track ? track.title : trackKey}`);
      playlistPopup.classList.remove('open');
    });
  });

  customAudioUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      playlistItems.forEach(el => el.classList.remove('active'));
      const uploadItem = document.querySelector('.upload-item');
      if (uploadItem) uploadItem.classList.add('active');

      customTrackTitle.textContent = file.name;
      romanticAudio.setCustomAudio(file);
      romanticAudio.play();
      updateAudioUI(true);

      showToast(`Đang phát: ${file.name}`);
      playlistPopup.classList.remove('open');
    }
  });

  // ================= 5. NÚT ĐIỀU KHIỂN VƯỜN HOA =================
  bloomMoreBtn.addEventListener('click', () => {
    garden.bloomAll();
    showToast('Đã gieo thêm những đóa hoa rực rỡ!');
  });

  clearBtn.addEventListener('click', () => {
    garden.clearGarden();
    garden.seedInitialGarden();
    showToast('Đang gieo lại một vườn hoa mới...');
  });

  minimizeBtn.addEventListener('click', () => {
    wishCard.classList.toggle('minimized');
  });

  // ================= 6. TẠO & SAO CHÉP LINK TẶNG RIÊNG (SHAREABLE URL GENERATOR) =================
  function buildShareUrl() {
    const baseUrl = window.location.origin + window.location.pathname;
    const sharePayload = {
      recipient: state.recipient,
      sender: state.sender,
      caption: state.caption,
      wish: state.wish,
      song: state.song
    };
    if (state.photoUrl) {
      sharePayload.photoUrl = state.photoUrl;
    }

    // Mã hóa UTF-8 an toàn cho tiếng Việt có dấu
    try {
      const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(sharePayload)))));
      return `${baseUrl}?card=${encoded}`;
    } catch (e) {
      // Dự phòng URL params thông thường
      const urlParams = new URLSearchParams({
        to: state.recipient,
        from: state.sender,
        caption: state.caption,
        msg: state.wish,
        song: state.song
      });
      if (state.photoUrl) urlParams.set('photo', state.photoUrl);
      return `${baseUrl}?${urlParams.toString()}`;
    }
  }

  function copyShareLinkToClipboard() {
    const shareUrl = buildShareUrl();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast(`Đã sao chép link tặng riêng cho "${state.recipient}"! 💌`);
      }).catch(() => {
        fallbackCopyText(shareUrl);
      });
    } else {
      fallbackCopyText(shareUrl);
    }
  }

  function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(`Đã sao chép link tặng riêng cho "${state.recipient}"! 💌`);
    } catch (err) {
      prompt('Hãy sao chép đường link này để gửi tặng:', text);
    }
    document.body.removeChild(textArea);
  }

  // Nút Tặng Link trên thanh công cụ
  shareToolbarBtn.addEventListener('click', () => {
    copyShareLinkToClipboard();
  });

  // Nút Chép Link trong hộp thoại tùy biến
  copyShareLinkBtn.addEventListener('click', () => {
    saveCurrentInputs();
    copyShareLinkToClipboard();
    closeModal();
  });

  // ================= 7. MODAL TÙY CHỈNH THÔNG ĐIỆP =================
  openModalBtn.addEventListener('click', () => {
    inputRecipient.value = state.recipient;
    inputSender.value = state.sender;
    inputCaption.value = state.caption;
    inputPhotoUrl.value = state.photoUrl || '';
    inputWish.value = state.wish;
    customModal.classList.add('open');
  });

  function closeModal() {
    customModal.classList.remove('open');
  }

  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);
  customModal.addEventListener('click', (e) => {
    if (e.target === customModal) closeModal();
  });

  quickTags.forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-tag');
      const preset = wishPresets[tag];
      if (preset) {
        inputRecipient.value = preset.recipient;
        inputSender.value = preset.sender;
        inputCaption.value = preset.caption;
        inputWish.value = preset.wish;
      }
    });
  });

  function saveCurrentInputs() {
    state.recipient = inputRecipient.value.trim() || 'Người Thương';
    state.sender = inputSender.value.trim() || 'Chàng trai IT';
    state.caption = inputCaption.value.trim() || 'Nụ cười tỏa nắng';
    state.wish = inputWish.value.trim() || 'Chúc mừng ngày 20/10 rực rỡ và tràn ngập niềm vui!';
    state.photoUrl = inputPhotoUrl.value.trim();

    updateDisplay();
  }

  saveModalBtn.addEventListener('click', () => {
    saveCurrentInputs();
    closeModal();
    showToast('Đã cập nhật thông điệp thành công!');
  });

  // ================= 8. TẢI THIỆP CHÚC MỪNG =================
  captureBtn.addEventListener('click', () => {
    showToast('Đang tạo thiệp chúc mừng...');

    setTimeout(() => {
      try {
        const sourceCanvas = document.getElementById('gardenCanvas');
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = sourceCanvas.width;
        exportCanvas.height = sourceCanvas.height;
        const ctx = exportCanvas.getContext('2d');

        // 1. Vẽ toàn cảnh vườn hoa
        ctx.drawImage(sourceCanvas, 0, 0);

        // 2. Vẽ khung thiệp lưu niệm
        const cardWidth = Math.min(exportCanvas.width * 0.88, 920);
        const cardHeight = 260;
        const cardX = (exportCanvas.width - cardWidth) / 2;
        const cardY = 40;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, [24]);
        ctx.fill();

        ctx.strokeStyle = '#ff89a3';
        ctx.lineWidth = 3;
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, [24]);
        ctx.stroke();

        // 3. Vẽ ảnh Polaroid
        const photoSize = 170;
        const photoFrameX = cardX + 35;
        const photoFrameY = cardY + 30;

        ctx.save();
        ctx.translate(photoFrameX + photoSize / 2, photoFrameY + photoSize / 2);
        ctx.rotate(-0.04);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 12;
        ctx.fillRect(-photoSize / 2 - 8, -photoSize / 2 - 8, photoSize + 16, photoSize + 40);
        ctx.shadowColor = 'transparent';

        if (recipientPhoto.complete) {
          ctx.drawImage(recipientPhoto, -photoSize / 2, -photoSize / 2, photoSize, photoSize);
        }

        ctx.fillStyle = '#b82d56';
        ctx.font = 'bold 18px "Dancing Script", cursive';
        ctx.textAlign = 'center';
        ctx.fillText(state.caption, 0, photoSize / 2 + 25);
        ctx.restore();

        // 4. Lời chúc
        const textStartX = photoFrameX + photoSize + 40;
        const textWidth = cardWidth - (photoSize + 90);

        ctx.fillStyle = '#b82d56';
        ctx.font = 'bold 32px "Playfair Display", Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Dành tặng ${state.recipient} cả một vườn hoa 20/10`, textStartX, cardY + 65);

        ctx.fillStyle = '#4a2845';
        ctx.font = '22px "Quicksand", sans-serif';
        wrapText(ctx, state.wish, textStartX, cardY + 115, textWidth, 34);

        ctx.fillStyle = '#ff3366';
        ctx.font = 'italic bold 26px "Dancing Script", cursive';
        ctx.textAlign = 'right';
        ctx.fillText(state.sender, cardX + cardWidth - 35, cardY + cardHeight - 25);

        const imageURL = exportCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Thiep_20_10_${state.recipient.replace(/\s+/g, '_')}.png`;
        link.href = imageURL;
        link.click();

        showToast('Đã tải thiệp chúc mừng về máy!');
      } catch (err) {
        console.error('Lỗi chụp thiệp:', err);
        showToast('Không thể tạo file ảnh tự động.');
      }
    }, 200);
  });

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let curY = y;

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
        if (curY > y + lineHeight * 2) {
          ctx.fillText(line.trim() + '...', x, curY);
          return;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
  }

  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toastNotification.textContent = msg;
    toastNotification.classList.add('show');
    toastTimer = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 2800);
  }
});
