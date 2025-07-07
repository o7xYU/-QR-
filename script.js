// script.js (v2.0 - 动态种类管理)
(function () {
    if (document.getElementById('cqr-main-button')) return;

    const CQR_ID_PREFIX = 'cqr-';
    const CQR_TYPES_KEY = 'cqr_types_v2';
    const CQR_STICKERS_KEY = 'cqr_stickers_v1';
    const CQR_BUTTON_POS_KEY = 'cqr_button_pos_v1';

    // --- 0. 默认配置 ---
    const getDefaultTypes = () => ([
        { id: 'type_text', name: '文字信息', format: '“{content}”', ui: 'single' },
        { id: 'type_voice', name: '语音', format: "={duration}'|{message}=", ui: 'dual' },
        { id: 'type_cheat', name: '作弊模式', format: '({content})', ui: 'single' },
        { id: 'type_stickers', name: '表情包', format: '!{desc}|{url}!', ui: 'sticker' },
        { id: 'type_recall', name: '撤回', format: '--', ui: 'none' }
    ]);

    // --- 1. 动态加载外部库 ---
    const pickerScript = document.createElement('script');
    pickerScript.type = 'module';
    pickerScript.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
    document.head.appendChild(pickerScript);

    // --- 2. 创建基础UI框架 ---
    function createUI() {
        const create = (tag, id, className, html) => {
            const el = document.createElement(tag);
            if (id) el.id = CQR_ID_PREFIX + id;
            if (className) el.className = className.split(' ').map(c => CQR_ID_PREFIX + c).join(' ');
            if (html) el.innerHTML = html;
            return el;
        };

        const mainButton = create('div', 'main-button', null, '🥕');
        mainButton.title = '自定义QR插件';

        const inputPanel = create('div', 'input-panel', 'frosted-glass', `
            <nav id="${CQR_ID_PREFIX}panel-tabs"></nav>
            <div id="${CQR_ID_PREFIX}panel-content"></div>
            <div id="${CQR_ID_PREFIX}panel-footer">
                <div id="${CQR_ID_PREFIX}emoji-picker-btn">😊</div>
                <div id="${CQR_ID_PREFIX}settings-btn">⚙️</div>
                <div class="cqr-footer-actions">
                    <button id="${CQR_ID_PREFIX}recall-button">撤回</button>
                    <button id="${CQR_ID_PREFIX}insert-button">插入并发送</button>
                </div>
            </div>
        `);

        const emojiPicker = create('emoji-picker', 'emoji-picker', 'frosted-glass');
        const settingsModal = create('div', 'settings-modal', 'modal-backdrop hidden', `
            <div class="cqr-modal-content cqr-frosted-glass">
                <h3>⚙️ 种类与格式设置</h3>
                <div id="${CQR_ID_PREFIX}settings-help">
                    使用 <code>{placeholder}</code> 作为占位符。<br>
                    <strong>单输入:</strong> <code>{content}</code> | <strong>双输入:</strong> <code>{duration}</code>, <code>{message}</code><br>
                    <strong>表情包:</strong> <code>{desc}</code>, <code>{url}</code> | <strong>撤回:</strong> 无占位符
                </div>
                <form id="${CQR_ID_PREFIX}settings-form"></form>
                <div class="cqr-modal-actions">
                    <div class="left-actions"><button id="${CQR_ID_PREFIX}settings-restore-btn">恢复默认</button></div>
                    <div>
                        <button id="${CQR_ID_PREFIX}settings-add-type-btn">➕ 添加种类</button>
                        <button id="${CQR_ID_PREFIX}settings-cancel-btn">取消</button>
                        <button id="${CQR_ID_PREFIX}settings-save-btn">保存</button>
                    </div>
                </div>
            </div>`);
        
        // 表情包相关的模态框保持不变
        const addCategoryModal = create('div', 'add-category-modal', 'modal-backdrop hidden', `<div class="cqr-modal-content cqr-frosted-glass"><h3>添加新分类</h3><input type="text" id="${CQR_ID_PREFIX}new-category-name" placeholder="输入分类名称"><div class="cqr-modal-actions"><button id="${CQR_ID_PREFIX}cancel-category-btn">取消</button><button id="${CQR_ID_PREFIX}save-category-btn">保存</button></div></div>`);
        const addStickersModal = create('div', 'add-stickers-modal', 'modal-backdrop hidden', `<div class="cqr-modal-content cqr-frosted-glass"><h3 id="${CQR_ID_PREFIX}add-sticker-title"></h3><p>每行一个，格式为：<code>表情包描述:图片链接</code></p><textarea id="${CQR_ID_PREFIX}new-stickers-input" placeholder="可爱猫猫:https://example.com/cat.png\n狗狗点头:https://example.com/dog.gif"></textarea><div class="cqr-modal-actions"><button id="${CQR_ID_PREFIX}cancel-stickers-btn">取消</button><button id="${CQR_ID_PREFIX}save-stickers-btn">保存</button></div></div>`);

        return { mainButton, inputPanel, emojiPicker, settingsModal, addCategoryModal, addStickersModal };
    }

    // --- 3. 注入UI到页面 ---
    const { mainButton, inputPanel, emojiPicker, settingsModal, addCategoryModal, addStickersModal } = createUI();
    const anchor = document.querySelector('#chat-buttons-container, #send_form');
    if (anchor) {
        document.body.appendChild(mainButton);
        document.body.appendChild(inputPanel);
        document.body.appendChild(emojiPicker);
        document.body.appendChild(settingsModal);
        document.body.appendChild(addCategoryModal);
        document.body.appendChild(addStickersModal);
    } else {
        console.error("自定义QR插件：未能找到SillyTavern的UI挂载点，插件无法加载。");
        return;
    }

    // --- 4. 核心状态与数据 ---
    let currentTypeId = null;
    let loadedTypes = [];
    let stickerData = {};
    let currentStickerCategory = '', selectedSticker = null;

    // --- 5. 核心功能函数 ---
    function insertText(text) {
        const textarea = document.querySelector("#send_textarea");
        if (!textarea) return;
        const currentVal = textarea.value;
        const selectionStart = textarea.selectionStart;
        textarea.value = currentVal.substring(0, selectionStart) + text + currentVal.substring(textarea.selectionEnd);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = selectionStart + text.length;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function insertAndSendMessage(text) {
        const textarea = document.querySelector("#send_textarea");
        const sendButton = document.querySelector("#send_but_text");
        if (textarea && sendButton) {
            textarea.value = text;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            sendButton.click();
        } else {
            alert("未能找到输入框或发送按钮！");
        }
    }

    // 数据加载/保存
    function loadTypes() {
        const saved = localStorage.getItem(CQR_TYPES_KEY);
        loadedTypes = saved ? JSON.parse(saved) : getDefaultTypes();
    }
    function saveTypes() {
        localStorage.setItem(CQR_TYPES_KEY, JSON.stringify(loadedTypes));
    }
    function loadStickerData() {
        const data = localStorage.getItem(CQR_STICKERS_KEY);
        stickerData = data ? JSON.parse(data) : {};
    }
    function saveStickerData() {
        localStorage.setItem(CQR_STICKERS_KEY, JSON.stringify(stickerData));
    }

    // --- 6. 动态UI渲染 ---
    function renderAll() {
        renderTabsAndContent();
        const firstVisibleType = loadedTypes.find(t => t.ui !== 'none');
        if (firstVisibleType) {
            switchTab(firstVisibleType.id);
        }
    }

    function renderTabsAndContent() {
        const tabsContainer = get('panel-tabs');
        const contentContainer = get('panel-content');
        tabsContainer.innerHTML = '';
        contentContainer.innerHTML = '';

        loadedTypes.forEach(type => {
            if (type.ui === 'none') return; // '撤回' 等类型不显示为标签页

            // 创建标签按钮
            const tabButton = document.createElement('button');
            tabButton.className = 'cqr-tab-button';
            tabButton.dataset.typeId = type.id;
            tabButton.textContent = type.name;
            tabButton.onclick = () => switchTab(type.id);
            tabsContainer.appendChild(tabButton);

            // 创建内容区域
            const contentSection = document.createElement('div');
            contentSection.id = `${CQR_ID_PREFIX}content-${type.id}`;
            contentSection.className = 'cqr-content-section';

            switch (type.ui) {
                case 'single':
                    contentSection.innerHTML = `<textarea data-input-type="content" placeholder="在此输入内容..."></textarea>`;
                    break;
                case 'dual':
                    contentSection.innerHTML = `<input type="number" data-input-type="duration" placeholder="输入时长 (秒)..."><textarea data-input-type="message" placeholder="输入识别内容..."></textarea>`;
                    break;
                case 'sticker':
                    contentSection.innerHTML = `<div id="${CQR_ID_PREFIX}sticker-categories" class="cqr-sub-options-container"><button id="${CQR_ID_PREFIX}add-category-btn" class="cqr-sub-option-btn">+</button></div><div id="${CQR_ID_PREFIX}sticker-grid"></div>`;
                    break;
            }
            contentContainer.appendChild(contentSection);
        });
        
        // 重新绑定表情包分类按钮事件
        if (document.getElementById(`${CQR_ID_PREFIX}add-category-btn`)) {
            get('add-category-btn').onclick = () => { get('new-category-name').value = ''; toggleModal('add-category-modal', true); get('new-category-name').focus(); };
            renderStickerCategories();
            const firstCategory = Object.keys(stickerData)[0];
            if(firstCategory) switchStickerCategory(firstCategory);
        }
    }

    function switchTab(typeId) {
        currentTypeId = typeId;
        document.querySelectorAll('.cqr-tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.typeId === typeId));
        document.querySelectorAll('.cqr-content-section').forEach(sec => sec.classList.toggle('active', sec.id === `${CQR_ID_PREFIX}content-${typeId}`));
    }
    
    // 设置模态框渲染
    function renderSettingsForm() {
        const form = get('settings-form');
        form.innerHTML = '';
        loadedTypes.forEach(type => {
            const item = document.createElement('div');
            item.className = 'cqr-settings-item';
            item.dataset.typeId = type.id;
            item.innerHTML = `
                <input type="text" placeholder="种类名称" value="${type.name}">
                <input type="text" placeholder="回复格式" value="${type.format}">
                <button type="button" class="cqr-settings-delete-type-btn">✖</button>
            `;
            // 隐藏不可删除类型的删除按钮
            if (type.ui === 'sticker' || type.ui === 'none') {
                 item.querySelector('.cqr-settings-delete-type-btn').style.display = 'none';
            }
            form.appendChild(item);
        });
        // 绑定删除事件
        form.querySelectorAll('.cqr-settings-delete-type-btn').forEach(btn => {
            btn.onclick = (e) => {
                const itemToRemove = e.currentTarget.closest('.cqr-settings-item');
                const idToRemove = itemToRemove.dataset.typeId;
                if (confirm(`确定要删除这个种类吗？`)) {
                    loadedTypes = loadedTypes.filter(t => t.id !== idToRemove);
                    renderSettingsForm(); // 重新渲染表单
                }
            };
        });
    }

    // --- 7. 事件监听器 ---
    function setupEventListeners() {
        // 主按钮和面板
        mainButton.addEventListener('mousedown', dragHandler);
        mainButton.addEventListener('touchstart', dragHandler, { passive: false });
        document.addEventListener('click', (e) => {
            if (inputPanel.classList.contains('active') && !inputPanel.contains(e.target) && !mainButton.contains(e.target)) hidePanel();
            if (emojiPicker.style.display === 'block' && !emojiPicker.contains(e.target) && !get('emoji-picker-btn').contains(e.target)) emojiPicker.style.display = 'none';
        });

        // 插入/撤回 按钮
        get('recall-button').addEventListener('click', () => {
            const recallType = loadedTypes.find(t => t.ui === 'none');
            if (recallType) insertText(recallType.format);
        });

        get('insert-button').addEventListener('click', () => {
            const currentType = loadedTypes.find(t => t.id === currentTypeId);
            if (!currentType) return;

            let formattedText = currentType.format;
            const contentSection = get(`content-${currentTypeId}`);
            let canSend = true;

            switch (currentType.ui) {
                case 'single':
                    const contentInput = contentSection.querySelector('[data-input-type="content"]');
                    if(contentInput.value.trim()){
                        formattedText = formattedText.replace('{content}', contentInput.value);
                        contentInput.value = '';
                    } else canSend = false;
                    break;
                case 'dual':
                    const durationInput = contentSection.querySelector('[data-input-type="duration"]');
                    const messageInput = contentSection.querySelector('[data-input-type="message"]');
                    if(durationInput.value.trim() && messageInput.value.trim()){
                        formattedText = formattedText.replace('{duration}', durationInput.value).replace('{message}', messageInput.value);
                        durationInput.value = '';
                        messageInput.value = '';
                    } else canSend = false;
                    break;
                case 'sticker':
                    if (selectedSticker) {
                        formattedText = formattedText.replace('{desc}', selectedSticker.desc).replace('{url}', selectedSticker.url);
                    } else canSend = false;
                    break;
            }

            if (canSend) {
                insertAndSendMessage(formattedText);
            }
        });

        // 设置面板事件
        get('settings-btn').addEventListener('click', () => {
            renderSettingsForm();
            toggleModal('settings-modal', true);
        });
        get('settings-cancel-btn').addEventListener('click', () => toggleModal('settings-modal', false));
        get('settings-restore-btn').addEventListener('click', () => {
            if (confirm("确定要将所有种类和格式恢复为默认设置吗？")) {
                loadedTypes = getDefaultTypes();
                renderSettingsForm();
            }
        });
        get('settings-add-type-btn').addEventListener('click', () => {
            const form = get('settings-form');
            const newId = `type_custom_${Date.now()}`;
            const newItem = document.createElement('div');
            newItem.className = 'cqr-settings-item cqr-settings-item-new';
            newItem.dataset.typeId = newId;
            newItem.innerHTML = `
                <input type="text" placeholder="新种类名称" value="">
                <input type="text" placeholder="格式, 如: [{content}]" value="">
                <button type="button" class="cqr-settings-delete-type-btn">✖</button>
            `;
            form.appendChild(newItem);
            newItem.querySelector('.cqr-settings-delete-type-btn').onclick = () => newItem.remove();
        });
        get('settings-save-btn').addEventListener('click', () => {
            const newTypes = [];
            get('settings-form').querySelectorAll('.cqr-settings-item').forEach(item => {
                const nameInput = item.querySelectorAll('input')[0];
                const formatInput = item.querySelectorAll('input')[1];
                if (nameInput.value.trim() && formatInput.value.trim()) {
                    // 简单判断UI类型，可扩展
                    const uiType = formatInput.value.includes('{duration}') ? 'dual' : 'single';
                    newTypes.push({
                        id: item.dataset.typeId,
                        name: nameInput.value,
                        format: formatInput.value,
                        ui: uiType
                    });
                }
            });
            // 重新加入特殊类型
            const stickerType = loadedTypes.find(t => t.ui === 'sticker');
            const recallType = loadedTypes.find(t => t.ui === 'none');
            if(stickerType) newTypes.push(stickerType);
            if(recallType) newTypes.push(recallType);
            
            loadedTypes = newTypes;
            saveTypes();
            renderAll();
            toggleModal('settings-modal', false);
            alert('设置已保存！');
        });

        // Emoji Picker 事件
        get('emoji-picker-btn').addEventListener('click', e => {
            e.stopPropagation();
            const isVisible = emojiPicker.style.display === 'block';
            if (isVisible) {
                emojiPicker.style.display = 'none';
            } else {
                const btnRect = get('emoji-picker-btn').getBoundingClientRect();
                emojiPicker.style.top = `${btnRect.top - 350 - 10}px`;
                emojiPicker.style.left = `${btnRect.left - 150}px`;
                emojiPicker.style.display = 'block';
            }
        });
        emojiPicker.addEventListener('emoji-click', event => {
            const emoji = event.detail.unicode;
            const activeContent = document.querySelector('.cqr-content-section.active');
            const target = activeContent ? activeContent.querySelector('textarea') : null;
            if (target) {
                const { selectionStart, selectionEnd, value } = target;
                target.value = value.substring(0, selectionStart) + emoji + value.substring(selectionEnd);
                target.focus();
                target.selectionEnd = selectionStart + emoji.length;
            }
            emojiPicker.style.display = 'none';
        });
        
        // 表情包分类事件 (部分)
        get('cancel-category-btn').addEventListener('click', () => toggleModal('add-category-modal', false));
        get('save-category-btn').addEventListener('click', () => {
            const name = get('new-category-name').value.trim();
            if (name && !stickerData[name]) {
                stickerData[name] = [];
                saveStickerData();
                renderStickerCategories();
                switchStickerCategory(name);
                toggleModal('add-category-modal', false);
            } else alert(stickerData[name] ? '该分类已存在！' : '请输入有效的分类名称！');
        });
        // ... 其他表情包事件与v1相同，为简洁省略 ...
    }
    
    // --- 8. 辅助函数与初始化 ---
    // (此处省略了部分与v1相同的表情包渲染函数和拖拽函数，它们无需重大修改)
    function dragHandler(e) { /* ...与v1版本相同... */ let isClick = true; if (e.type === 'touchstart') e.preventDefault(); const rect = mainButton.getBoundingClientRect(); const offsetX = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - rect.left; const offsetY = (e.type.includes('mouse') ? e.clientY : e.touches[0].clientY) - rect.top; const move = (e) => { isClick = false; mainButton.classList.add('is-dragging'); let newLeft = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - offsetX; let newTop = (e.type.includes('mouse') ? e.clientY : e.touches[0].clientY) - offsetY; newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - mainButton.offsetWidth)); newTop = Math.max(0, Math.min(newTop, window.innerHeight - mainButton.offsetHeight)); mainButton.style.position = 'fixed'; mainButton.style.left = `${newLeft}px`; mainButton.style.top = `${newTop}px`; }; const end = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', end); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end); mainButton.classList.remove('is-dragging'); if (isClick) { inputPanel.classList.contains('active') ? hidePanel() : showPanel(); } else { localStorage.setItem(CQR_BUTTON_POS_KEY, JSON.stringify({ top: mainButton.style.top, left: mainButton.style.left })); } }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', end); document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', end); }
    function renderStickerCategories(){ /* ...与v1版本类似... */ const container = get('sticker-categories'); if(!container) return; container.querySelectorAll('.cqr-sticker-category-btn').forEach(btn => btn.remove()); Object.keys(stickerData).forEach(name => { const btn = document.createElement("button"); btn.className = "cqr-sub-option-btn cqr-sticker-category-btn"; btn.textContent = name; btn.dataset.category = name; btn.onclick = () => switchStickerCategory(name); container.appendChild(btn); }); }
    function switchStickerCategory(categoryName){ /* ...与v1版本类似... */ currentStickerCategory = categoryName; selectedSticker = null; document.querySelectorAll(".cqr-sticker-category-btn").forEach(btn => { btn.classList.toggle("active", btn.dataset.category === categoryName); }); renderStickers(categoryName); }
    function renderStickers(categoryName){ /* ...与v1版本类似... */ const grid = get('sticker-grid'); if(!grid) return; grid.innerHTML = ""; if (!categoryName || !stickerData[categoryName]) { grid.innerHTML = '<div class="cqr-sticker-placeholder">请选择或添加分类...</div>'; return; } const stickers = stickerData[categoryName]; if (stickers.length === 0) { grid.innerHTML = '<div class="cqr-sticker-placeholder">该分类下没有表情包...</div>'; return; } stickers.forEach((sticker, index) => { const wrapper = document.createElement("div"); wrapper.className = "cqr-sticker-wrapper"; const img = document.createElement("img"); img.src = sticker.url; img.title = sticker.desc; img.className = "cqr-sticker-item"; img.onclick = () => { document.querySelectorAll(".cqr-sticker-item.selected").forEach(el => el.classList.remove("selected")); img.classList.add("selected"); selectedSticker = sticker; }; const delBtn = document.createElement("button"); delBtn.innerHTML = "&times;"; delBtn.className = "cqr-delete-sticker-btn"; delBtn.title = "删除"; delBtn.onclick = e => { e.stopPropagation(); if (confirm(`确定删除表情「${sticker.desc}」?`)) { stickerData[currentStickerCategory].splice(index, 1); saveStickerData(); renderStickers(currentStickerCategory); } }; wrapper.appendChild(img); wrapper.appendChild(delBtn); grid.appendChild(wrapper); }); }
    function showPanel() { const btnRect = mainButton.getBoundingClientRect(); const panelHeight = inputPanel.offsetHeight || 420; const panelWidth = inputPanel.offsetWidth || 380; let top = btnRect.top - panelHeight - 10; if (top < 10) top = btnRect.bottom + 10; let left = btnRect.left + (btnRect.width / 2) - (panelWidth / 2); left = Math.max(10, Math.min(left, window.innerWidth - panelWidth - 10)); inputPanel.style.top = `${top}px`; inputPanel.style.left = `${left}px`; inputPanel.classList.add('active'); }
    function hidePanel() { inputPanel.classList.remove('active'); }
    function toggleModal(modalId, show) { get(modalId).classList.toggle("hidden", !show); }
    function loadButtonPosition() { const savedPos = JSON.parse(localStorage.getItem(CQR_BUTTON_POS_KEY)); if (savedPos?.top && savedPos?.left) { mainButton.style.position = 'fixed'; mainButton.style.top = savedPos.top; mainButton.style.left = savedPos.left; } }

    function init() {
        loadTypes();
        loadStickerData();
        loadButtonPosition();
        renderAll();
        setupEventListeners();
    }

    init();
})();
