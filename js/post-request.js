// js/post-request.js
// PostRequestForm logic — validation, Firebase Storage upload, Firestore write

const PostRequest = {
  selectedTag: '',
  imageFile: null,
  uploading: false,

  PASTRY_TYPES: [
    'Wedding Cake','Birthday Cake','Artisan Bread','Croissants',
    'Macarons','Cupcakes','Custom Savory','Cheesecake',
    'Tarts & Pastries','Donuts','Other',
  ],
  OCCASION_TAGS: [
    'Wedding','Birthday','Anniversary','Corporate',
    'Baby Shower','Graduation','Holiday','Just Because',
  ],
  MIN_BID: 5,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg','image/png','image/webp'],

  // ── Init ───────────────────────────────────────────────────────
  init() {
    PostRequest._buildForm();
    PostRequest._wireEvents();
  },

  // ── Build form HTML ────────────────────────────────────────────
  _buildForm() {
    const body = document.getElementById('post-form-body');
    if (!body) return;

    // Pastry type options
    const typeOptions = PostRequest.PASTRY_TYPES
      .map(t => `<option value="${t}">${t}</option>`).join('');

    // Occasion tags
    const tagBtns = PostRequest.OCCASION_TAGS
      .map(t => `<button type="button" class="occasion-tag" data-tag="${t}">${t}</button>`).join('');

    body.innerHTML = `
    <form id="post-request-form" novalidate>

      <!-- PASTRY DETAILS -->
      <div class="form-section">
        <div class="section-divider"><span>Pastry details</span><hr></div>

        <div class="form-field">
          <label class="field-label">${MK.icon.tag} Pastry type <span class="req">*</span></label>
          <div class="select-wrap">
            <select class="select" id="f-pastry-type">
              <option value="">Select a pastry type…</option>
              ${typeOptions}
            </select>
          </div>
          <div class="field-error" id="err-f-pastry-type">
            ${MK.icon.warning} <span class="err-text">Please select a pastry type.</span>
          </div>
        </div>

        <div class="form-field">
          <label class="field-label">${MK.icon.tag} Occasion / Event type</label>
          <div class="occasion-tags">${tagBtns}</div>
        </div>

        <div class="form-field">
          <label class="field-label">${MK.icon.file} Detailed brief <span class="req">*</span></label>
          <textarea class="textarea" id="f-description"
            placeholder='e.g. "Lavender & honey, 3-tier, nut-free, dusty rose color scheme, serves 80 guests"'
            rows="4"></textarea>
          <div class="field-error" id="err-f-description">
            ${MK.icon.warning} <span class="err-text">A brief is required.</span>
          </div>
        </div>
      </div>

      <!-- FINANCIALS -->
      <div class="form-section">
        <div class="section-divider"><span>Financials</span><hr></div>
        <div class="form-field">
          <label class="field-label">${MK.icon.dollar} Your starting bid <span class="req">*</span></label>
          <div class="input-prefix-wrap">
            <span class="prefix">$</span>
            <input class="input" type="number" id="f-bid" min="${PostRequest.MIN_BID}"
              step="0.01" placeholder="e.g. 120">
          </div>
          <div id="bid-hint" class="field-hint" style="display:none"></div>
          <div class="field-error" id="err-f-bid">
            ${MK.icon.warning} <span class="err-text">Minimum luxury bid is $${PostRequest.MIN_BID}.</span>
          </div>
        </div>
      </div>

      <!-- LOGISTICS -->
      <div class="form-section">
        <div class="section-divider"><span>Logistics</span><hr></div>
        <div class="form-field">
          <label class="field-label">${MK.icon.pin} Delivery / Pickup location <span class="req">*</span></label>
          <input class="input" type="text" id="f-location" placeholder="e.g. Avondale, Harare">
          <div class="field-error" id="err-f-location">
            ${MK.icon.warning} <span class="err-text">Location is required.</span>
          </div>
        </div>
        <div class="form-field">
          <label class="field-label">${MK.icon.calendar} Deadline — date &amp; time <span class="req">*</span></label>
          <input class="input" type="datetime-local" id="f-deadline">
          <div class="field-error" id="err-f-deadline">
            ${MK.icon.warning} <span class="err-text" id="deadline-err-text">Please set a deadline.</span>
          </div>
        </div>
        <div class="form-field">
          <label class="field-label">${MK.icon.users} Serving size</label>
          <input class="input" type="number" id="f-servings" min="1" placeholder="e.g. 80 guests">
        </div>
        <div class="form-field">
          <label class="field-label">${MK.icon.shield} Dietary requirements</label>
          <input class="input" type="text" id="f-dietary"
            placeholder="e.g. Nut-free, Vegan, Gluten-free">
        </div>
      </div>

      <!-- INSPIRATION IMAGE -->
      <div class="form-section">
        <div class="section-divider"><span>Visual inspiration</span><hr></div>
        <div id="drop-zone" class="drop-zone">
          <div class="drop-zone-icon">${MK.icon.image}</div>
          <p class="drop-zone-text">Drop your image here or <span>browse</span></p>
          <p class="drop-zone-hint">JPG, PNG, WEBP — max 5 MB</p>
          <input type="file" id="file-input" accept=".jpg,.jpeg,.png,.webp" style="display:none">
        </div>
        <div id="upload-preview-wrap" class="upload-preview-wrap hidden">
          <img id="upload-preview-img" src="" alt="Preview">
          <div id="upload-progress-overlay" class="upload-progress-overlay hidden">
            <div class="progress-ring-wrap">
              <svg width="64" height="64" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none"
                  stroke="rgba(255,255,255,0.1)" stroke-width="4"/>
                <circle id="progress-ring-fill" cx="28" cy="28" r="24" fill="none"
                  stroke="#FF8C00" stroke-width="4" stroke-linecap="round"
                  stroke-dasharray="150.8" stroke-dashoffset="150.8"
                  style="transition:stroke-dashoffset .3s ease"/>
              </svg>
              <span class="progress-ring-text" id="progress-pct">0%</span>
            </div>
            <span style="font-size:11px;color:rgba(255,255,255,0.5)">Uploading to storage…</span>
          </div>
          <button type="button" class="upload-remove-btn" id="upload-remove-btn">✕</button>
        </div>
        <div class="field-error" id="err-image">
          ${MK.icon.warning} <span class="err-text" id="img-err-text"></span>
        </div>
      </div>

      <!-- ACTIONS -->
      <div style="display:flex;gap:12px;margin-top:8px">
        <button type="button" class="btn btn-ghost flex-1" id="post-cancel-btn">Cancel</button>
        <button type="submit" class="btn btn-gold flex-1" id="post-submit-btn">
          ${MK.icon.upload} Publish Request
        </button>
      </div>

    </form>`;
  },

  // ── Wire events ────────────────────────────────────────────────
  _wireEvents() {
    const body = document.getElementById('post-form-body');
    if (!body) return;

    // Form submit
    const form = document.getElementById('post-request-form');
    if (form) form.addEventListener('submit', PostRequest.handleSubmit.bind(PostRequest));

    // Bid live validation
    const bidInput = document.getElementById('f-bid');
    if (bidInput) bidInput.addEventListener('input', PostRequest.onBidInput.bind(PostRequest));

    // Clear errors on change
    ['f-pastry-type','f-description','f-location','f-deadline'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => MK.clearFieldError(id));
      if (el) el.addEventListener('change', () => MK.clearFieldError(id));
    });

    // Occasion tags
    body.querySelectorAll('.occasion-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        if (PostRequest.selectedTag === tag) {
          PostRequest.selectedTag = '';
          btn.classList.remove('active');
        } else {
          body.querySelectorAll('.occasion-tag').forEach(b => b.classList.remove('active'));
          PostRequest.selectedTag = tag;
          btn.classList.add('active');
        }
      });
    });

    // Drop zone
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    if (dropZone) {
      dropZone.addEventListener('click', () => fileInput?.click());
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        PostRequest.handleImageFile(e.dataTransfer.files[0]);
      });
    }
    if (fileInput) fileInput.addEventListener('change', (e) => PostRequest.handleImageFile(e.target.files[0]));

    // Remove image
    const removeBtn = document.getElementById('upload-remove-btn');
    if (removeBtn) removeBtn.addEventListener('click', PostRequest.removeImage.bind(PostRequest));

    // Cancel button
    const cancelBtn = document.getElementById('post-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => MK.closeModal('post-modal'));
  },

  // ── Bid live validation ────────────────────────────────────────
  onBidInput() {
    const val = parseFloat(document.getElementById('f-bid')?.value);
    const hint = document.getElementById('bid-hint');
    const errEl = document.getElementById('err-f-bid');
    MK.clearFieldError('f-bid');
    if (hint) hint.style.display = 'none';
    if (!val) return;
    if (val < PostRequest.MIN_BID) {
      MK.showFieldError('f-bid', `Minimum luxury bid is $${PostRequest.MIN_BID}.`);
    } else {
      if (hint) {
        hint.textContent = `Suppliers may counter-offer above $${val.toFixed(2)}.`;
        hint.style.display = 'block';
      }
    }
  },

  // ── Image file handling ────────────────────────────────────────
  handleImageFile(file) {
    const errEl = document.getElementById('err-image');
    if (errEl) errEl.classList.remove('show');

    if (!file) return;
    if (!PostRequest.ALLOWED_TYPES.includes(file.type)) {
      document.getElementById('img-err-text').textContent = 'Only JPG, PNG, or WEBP files are accepted.';
      errEl?.classList.add('show');
      return;
    }
    if (file.size > PostRequest.MAX_FILE_SIZE) {
      document.getElementById('img-err-text').textContent = 'File exceeds the 5 MB limit.';
      errEl?.classList.add('show');
      return;
    }

    PostRequest.imageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.getElementById('upload-preview-img');
      const wrap = document.getElementById('upload-preview-wrap');
      const zone = document.getElementById('drop-zone');
      if (img)  img.src = e.target.result;
      if (wrap) wrap.classList.remove('hidden');
      if (zone) zone.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  },

  removeImage() {
    PostRequest.imageFile = null;
    const img  = document.getElementById('upload-preview-img');
    const wrap = document.getElementById('upload-preview-wrap');
    const zone = document.getElementById('drop-zone');
    const fi   = document.getElementById('file-input');
    if (img)  img.src = '';
    if (wrap) wrap.classList.add('hidden');
    if (zone) zone.classList.remove('hidden');
    if (fi)   fi.value = '';
  },

  // ── Upload image to Firebase Storage ──────────────────────────
  uploadImage(userId) {
    return new Promise((resolve, reject) => {
      if (!PostRequest.imageFile) return resolve(null);

      const path = `inspiration_images/${userId}_${Date.now()}_${PostRequest.imageFile.name}`;
      const storageRef = storage.ref(path);
      const task = storageRef.put(PostRequest.imageFile);

      const overlay = document.getElementById('upload-progress-overlay');
      const ring    = document.getElementById('progress-ring-fill');
      const pct     = document.getElementById('progress-pct');
      if (overlay) overlay.classList.remove('hidden');

      task.on('state_changed',
        (snap) => {
          const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          const circumference = 150.8;
          if (ring) ring.style.strokeDashoffset = circumference * (1 - progress / 100);
          if (pct)  pct.textContent = progress + '%';
        },
        (err) => {
          if (overlay) overlay.classList.add('hidden');
          reject(err);
        },
        async () => {
          const url = await task.snapshot.ref.getDownloadURL();
          if (overlay) overlay.classList.add('hidden');
          resolve(url);
        }
      );
    });
  },

  // ── Validate form ──────────────────────────────────────────────
  validate() {
    let valid = true;
    MK.clearAllErrors(['f-pastry-type','f-bid','f-location','f-deadline','f-description']);

    if (!document.getElementById('f-pastry-type')?.value) {
      MK.showFieldError('f-pastry-type', 'Please select a pastry type.'); valid = false;
    }

    const bid = parseFloat(document.getElementById('f-bid')?.value);
    if (!document.getElementById('f-bid')?.value || isNaN(bid) || bid < PostRequest.MIN_BID) {
      MK.showFieldError('f-bid', `Minimum luxury bid is $${PostRequest.MIN_BID}.`); valid = false;
    }

    if (!document.getElementById('f-location')?.value.trim()) {
      MK.showFieldError('f-location', 'Location is required.'); valid = false;
    }

    const deadlineVal = document.getElementById('f-deadline')?.value;
    if (!deadlineVal) {
      MK.showFieldError('f-deadline', 'Please set a deadline.'); valid = false;
    } else if (new Date(deadlineVal) < new Date()) {
      MK.showFieldError('f-deadline', 'Deadline must be in the future.'); valid = false;
    }

    if (!document.getElementById('f-description')?.value.trim()) {
      MK.showFieldError('f-description', 'A brief is required.'); valid = false;
    }

    return valid;
  },

  // ── Form submit ────────────────────────────────────────────────
  async handleSubmit(e) {
    e.preventDefault();
    if (!PostRequest.validate()) return;

    const user = Auth.currentUser;
    if (!user) { MK.toast('Please sign in first.', 'error'); return; }

    const btn = document.getElementById('post-submit-btn');
    MK.setButtonLoading(btn, 'Publishing…');

    try {
      const imageUrl = await PostRequest.uploadImage(user.uid);

      await db.collection('requests').add({
        pastryType:    document.getElementById('f-pastry-type')?.value,
        startingPrice: parseFloat(document.getElementById('f-bid')?.value),
        location:      document.getElementById('f-location')?.value.trim(),
        deadline:      new Date(document.getElementById('f-deadline')?.value),
        description:   document.getElementById('f-description')?.value.trim(),
        servings:      parseInt(document.getElementById('f-servings')?.value) || null,
        dietaryNotes:  document.getElementById('f-dietary')?.value.trim() || null,
        occasionTag:   PostRequest.selectedTag || null,
        imageUrl:      imageUrl || null,
        customerId:    user.uid,
        customerName:  user.displayName || 'Anonymous',
        customerEmail: user.email,
        status:        'open',
        bids:          [],
        createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      });

      MK.toast('Request published! Suppliers are being notified.', 'success');
      MK.closeModal('post-modal');
      PostRequest.resetForm();
    } catch (err) {
      console.error(err);
      MK.toast('Something went wrong. Please try again.', 'error');
    } finally {
      MK.resetButton(btn);
    }
  },

  // ── Reset form to empty state ──────────────────────────────────
  resetForm() {
    const form = document.getElementById('post-request-form');
    if (form) form.reset();
    PostRequest.selectedTag = '';
    PostRequest.imageFile   = null;
    document.querySelectorAll('.occasion-tag').forEach(b => b.classList.remove('active'));
    PostRequest.removeImage();
  },
};

window.PostRequest = PostRequest;
