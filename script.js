// script.js (Custom QR Plugin v1.3 - Modified from original)
(function () {
    if (document.getElementById('cip-carrot-button')) return;

    // --- 动态加载Emoji Picker库 ---
    const pickerScript = document.createElement('script');
    pickerScript.type = 'module';
    pickerScript.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
    document.head.appendChild(pickerScript);

    // --- 0. 全局状态和数据定义 ---
    let formats = [];
    let currentTabId = null;
    let selectedSticker = null;
    let lastFocusedInput = null; // FIX: 追踪最后一个获得焦点的输入框
    const FORMAT_STORAGE_KEY = 'cip_custom_formats_v2';
    const STICKER_STORAGE_KEY = 'cip_sticker_data'; // Re-use old sticker key for compatibility
    const POS_STORAGE_KEY = 'cip_button_position_v5';

    // 默认格式 (移除了 "撤回")
    const defaultFormats = [
        { id: 'text', name: '文字信息', format: '“{content}”', type: 'textarea', placeholder: '在此输入文字...' },
        { id: 'voice', name: '语音', format: "={duration}'|{message}=", type: 'dual_input', placeholder: '输入语音识别出的内容...', placeholder2: '输入时长 (秒, 仅数字)' },
        { id: 'bunny', name: '作弊模式', format: '({content})', type: 'textarea', placeholder: '在此输入想对AI说的话...' },
        { id: 'stickers', name: '表情包', format: '!{desc}|{url}!', type: 'sticker' }
    ];

    // --- 1. 创建所有UI元素 ---
    function createUI() {
        const create = (tag, id, className, html) => {
            const el = document.createElement(tag);
            if (id) el.id = id;
            if (className) el.className = className;
            if (html) el.innerHTML = html;
            return el;
        };
        const carrotButton = create('div', 'cip-carrot-button', null, '🥕');
        carrotButton.title = '自定义快捷输入';

        // 主面板，内容将动态生成
        const inputPanel = create('div', 'cip-input-panel', 'cip-frosted-glass', `
            <nav id="cip-panel-tabs"></nav>
            <div id="cip-format-display"></div>
            <div id="cip-panel-content"></div>
            <div id="cip-panel-footer">
                <button id="cip-emoji-picker-btn">😊</button>
                <div class="cip-footer-actions">
                    <button id="cip-recall-button">撤回</button>
                    <button id="cip-insert-button">插 入</button>
                    <button id="cip-settings-button">⚙️</button>
                </div>
            </div>
        `);
        
        const emojiPicker = create('emoji-picker', 'cip-emoji-picker', 'cip-frosted-glass');
        const addCategoryModal = create('div', 'cip-add-category-modal', 'cip-modal-backdrop hidden', `<div class="cip-modal-content cip-frosted-glass"><h3>添加新分类</h3><input type="text" id="cip-new-category-name" class="cip-input" placeholder="输入分类名称"><div class="cip-modal-actions"><button id="cip-cancel-category-btn">取消</button><button id="cip-save-category-btn">保存</button></div></div>`);
        const addStickersModal = create('div', 'cip-add-stickers-modal', 'cip-modal-backdrop hidden', `<div class="cip-modal-content cip-frosted-glass"><h3 id="cip-add-sticker-title"></h3><p>每行一个，格式为：<br><code>表情包描述:图片链接</code></p><textarea id="cip-new-stickers-input" class="cip-input"></textarea><div class="cip-modal-actions"><button id="cip-cancel-stickers-btn">取消</button><button id="cip-save-stickers-btn">保存</button></div></div>`);
        
        // 设置面板
        const settingsModal = create('div', 'cip-settings-modal', 'cip-modal-backdrop hidden', `
            <div class="cip-modal-content cip-frosted-glass">
                <h3>插件设置</h3>
                <div id="cip-settings-list"></div>
                <div class="cip-modal-actions">
                    <button id="cip-add-format-btn">+ 添加种类</button>
                    <div>
                        <button id="cip-close-settings-btn">关闭</button>
                        <button id="cip-save-settings-btn">保存</button>
                    </div>
                </div>
            </div>
        `);

        return { carrotButton, inputPanel, emojiPicker, addCategoryModal, addStickersModal, settingsModal };
    }

    // --- 2. 注入UI到页面中 ---
    const { carrotButton, inputPanel, emojiPicker, addCategoryModal, addStickersModal, settingsModal } = createUI();
    const anchor = document.querySelector('#chat-buttons-container, #send_form');
    if (anchor) {
        document.body.append(carrotButton, inputPanel, emojiPicker, addCategoryModal, addStickersModal, settingsModal);
    } else {
        console.error("自定义QR插件：未能找到SillyTavern的UI挂载点，插件无法加载。");
        return;
    }

    // --- 3. 获取所有元素的引用 ---
    const get = (id) => document.getElementById(id);
    const queryAll = (sel) => document.querySelectorAll(sel);
    const formatDisplay = get('cip-format-display'), insertButton = get('cip-insert-button');
    const emojiPickerBtn = get('cip-emoji-picker-btn');

    // --- 4. 数据处理 (加载/保存) ---
    let stickerData = {};
    function saveFormats() { localStorage.setItem(FORMAT_STORAGE_KEY, JSON.stringify(formats)); }
    function loadFormats() {
        const saved = localStorage.getItem(FORMAT_STORAGE_KEY);
        formats = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultFormats));
    }
    function saveStickerData(){ localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(stickerData)); }
    function loadStickerData(){
        const t = localStorage.getItem(STICKER_STORAGE_KEY);
        stickerData = t ? JSON.parse(t) : { '默认': [] };
    }

    // --- 5. 动态渲染核心 ---
    function renderAll() {
        renderTabs();
        renderContentPanels();
        const firstTab = formats.find(f => f.type !== 'instant');
        if (firstTab) {
            // If currentTabId is invalid, reset to the first available tab
            if (!formats.some(f => f.id === currentTabId)) {
                currentTabId = firstTab.id;
            }
            switchTab(currentTabId);
        } else {
            // No tabs available
            currentTabId = null;
            get('cip-panel-content').innerHTML = '';
            updateFormatDisplay();
        }
    }

    function renderTabs() {
        const tabsContainer = get('cip-panel-tabs');
        tabsContainer.innerHTML = '';
        formats.forEach(format => {
            const button = document.createElement('button');
            button.className = 'cip-tab-button';
            button.textContent = format.name;
            button.dataset.id = format.id;
            if (format.type === 'instant') {
                button.addEventListener('click', () => insertIntoSillyTavern(format.format));
            } else {
                button.addEventListener('click', (e) => switchTab(e.currentTarget.dataset.id));
            }
            tabsContainer.appendChild(button);
        });
    }

    function renderContentPanels() {
        const contentContainer = get('cip-panel-content');
        contentContainer.innerHTML = '';
        formats.filter(f => f.type !== 'instant').forEach(format => {
            const section = document.createElement('div');
            section.id = `content-${format.id}`;
            section.className = 'cip-content-section';
            
            switch(format.type) {
                case 'textarea':
                    section.innerHTML = `<textarea id="input-${format.id}" class="cip-input" placeholder="${format.placeholder || ''}"></textarea>`;
                    break;
                case 'dual_input':
                    section.innerHTML = `
                        <input type="text" id="input2-${format.id}" class="cip-input" placeholder="${format.placeholder2 || ''}">
                        <textarea id="input-${format.id}" class="cip-input" placeholder="${format.placeholder || ''}"></textarea>`;
                    break;
                case 'sticker':
                    section.innerHTML = `
                        <div id="cip-sticker-categories" class="cip-sub-options-container"></div>
                        <div id="cip-sticker-grid"></div>`;
                    break;
            }
            contentContainer.appendChild(section);
        });
    }

    function switchTab(id) {
        currentTabId = id;
        selectedSticker = null;
        queryAll('.cip-tab-button').forEach(b => b.classList.toggle('active', b.dataset.id === id));
        queryAll('.cip-content-section').forEach(s => s.classList.toggle('active', s.id === `content-${id}`));
        
        const format = formats.find(f => f.id === id);
        if (format && format.type === 'sticker') {
            renderStickerCategories();
            const firstCategory = Object.keys(stickerData).find(k => k !== 'currentCategory') || null;
            switchStickerCategory(stickerData.currentCategory || firstCategory);
        }
        updateFormatDisplay();
    }

    function updateFormatDisplay(){
        const format = formats.find(f => f.id === currentTabId);
        if (format) {
            formatDisplay.textContent = `格式: ${format.format.replace('{content}', '内容').replace('{message}', '内容')}`;
        } else {
            formatDisplay.textContent = '';
        }
    }

    // --- 6. 表情包逻辑 (从原文件复用并适配) ---
    let currentStickerCategory = '';
    function switchStickerCategory(category){
        if (!category) {
            const firstCat = Object.keys(stickerData).find(k => k !== 'currentCategory');
            if (firstCat) category = firstCat;
            else { // No categories exist
                renderStickerCategories(); // Render the add button
                const stickerGrid = get('cip-sticker-grid');
                if(stickerGrid) stickerGrid.innerHTML='<div class="cip-sticker-placeholder">请先添加一个分类...</div>';
                return;
            }
        }
        currentStickerCategory = category;
        if(stickerData) stickerData.currentCategory = category; // Save current category
        
        renderStickerCategories(); // Re-render to show active state and icons
        renderStickers(category);
        selectedSticker=null;
    }
    function renderStickers(category){
        const stickerGrid = get('cip-sticker-grid');
        if(!stickerGrid) return;
        stickerGrid.innerHTML = "";
        if(!category || !stickerData[category]) return void(stickerGrid.innerHTML='<div class="cip-sticker-placeholder">请先选择或添加一个分类...</div>');
        const stickers = stickerData[category];
        if(0 === stickers.length) return void(stickerGrid.innerHTML='<div class="cip-sticker-placeholder">这个分类还没有表情包...</div>');
        stickers.forEach((sticker, index)=>{
            const wrapper=document.createElement("div"); wrapper.className="cip-sticker-wrapper";
            const img=document.createElement("img"); img.src=sticker.url; img.title=sticker.desc; img.className="cip-sticker-item";
            img.onclick=()=>{ queryAll(".cip-sticker-item.selected").forEach(e=>e.classList.remove("selected")); img.classList.add("selected"); selectedSticker=sticker; };
            const delBtn=document.createElement("button"); delBtn.innerHTML="&times;"; delBtn.className="cip-delete-sticker-btn"; delBtn.title="删除这个表情包";
            delBtn.onclick=e=>{ e.stopPropagation(); if(confirm(`确定删除表情「${sticker.desc}」?`)){ stickerData[currentStickerCategory].splice(index,1); saveStickerData(); renderStickers(currentStickerCategory); }};
            wrapper.appendChild(img); wrapper.appendChild(delBtn); stickerGrid.appendChild(wrapper);
        });
    }
    function renderStickerCategories(){
        const container = get('cip-sticker-categories');
        if(!container) return;
        container.innerHTML = '';
        Object.keys(stickerData).filter(k => k !== 'currentCategory').forEach(name=>{
            const btn=document.createElement("button");
            const btnText = document.createElement('span');
            btnText.textContent = name;
            btn.appendChild(btnText);

            btn.className="cip-sub-option-btn"; btn.dataset.category=name;
            btn.onclick=()=>switchStickerCategory(name); 

            if (name === currentStickerCategory) {
                btn.classList.add('active');
                
                const addStickerBtn = document.createElement('i');
                addStickerBtn.textContent = ' ➕';
                addStickerBtn.className = 'cip-category-action-icon';
                addStickerBtn.title = '向此分类添加表情包';
                addStickerBtn.onclick = (e) => {
                    e.stopPropagation();
                    get('cip-add-sticker-title').textContent = `为「${currentStickerCategory}」分类添加表情包`;
                    get('cip-new-stickers-input').value = "";
                    toggleModal('cip-add-stickers-modal', true);
                    get('cip-new-stickers-input').focus();
                };
                btn.appendChild(addStickerBtn);

                const deleteCategoryBtn = document.createElement('i');
                deleteCategoryBtn.textContent = ' 🗑️';
                deleteCategoryBtn.className = 'cip-category-action-icon cip-delete-category-btn';
                deleteCategoryBtn.title = '删除此分类';
                deleteCategoryBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`确定删除「${currentStickerCategory}」分类及其所有表情包吗?`)) {
                        delete stickerData[currentStickerCategory];
                        stickerData.currentCategory = null; // Reset current category
                        saveStickerData();
                        switchStickerCategory(null); // Switch to first available or show empty state
                    }
                };
                btn.appendChild(deleteCategoryBtn);
            }
            container.appendChild(btn);
        });
        const addBtn = document.createElement('button');
        addBtn.id = 'cip-add-category-btn'; addBtn.className = 'cip-sub-option-btn'; addBtn.textContent = '+';
        addBtn.onclick = () => { get('cip-new-category-name').value = ''; toggleModal('cip-add-category-modal', true); get('cip-new-category-name').focus(); };
        container.appendChild(addBtn);
    }
    function toggleModal(id, show){ get(id).classList.toggle("hidden", !show); }
    
    // --- 7. 设置面板逻辑 ---
    function renderSettings() {
        const list = get('cip-settings-list');
        list.innerHTML = '';
        formats.forEach(format => {
            const item = document.createElement('div');
            item.className = 'cip-format-item';
            item.dataset.id = format.id;
            item.innerHTML = `
                <input type="text" class="cip-format-name-input" value="${format.name}" placeholder="名称">
                <input type="text" class="cip-format-format-input" value="${format.format}" placeholder="格式">
                <button class="cip-delete-format-btn" title="删除此项">&times;</button>
            `;
            item.querySelector('.cip-delete-format-btn').onclick = (e) => {
                const idToDelete = e.currentTarget.closest('.cip-format-item').dataset.id;
                formats = formats.filter(f => f.id !== idToDelete);
                renderSettings(); // Re-render list
            };
            list.appendChild(item);
        });
    }

    // --- 8. 核心事件监听 ---
    // 插入按钮
    insertButton.addEventListener('click', () => {
        let formattedText = '';
        const format = formats.find(f => f.id === currentTabId);
        if (!format) return;

        switch (format.type) {
            case 'textarea':
                const mainInput = get(`input-${format.id}`);
                if (mainInput && mainInput.value.trim()) {
                    formattedText = format.format.replace('{content}', mainInput.value);
                    mainInput.value = '';
                }
                break;
            case 'dual_input':
                const voiceMsgInput = get(`input-${format.id}`);
                const durationInput = get(`input2-${format.id}`);
                if (durationInput && voiceMsgInput && durationInput.value.trim() && voiceMsgInput.value.trim()) {
                    formattedText = format.format.replace('{duration}', durationInput.value).replace('{message}', voiceMsgInput.value);
                    voiceMsgInput.value = '';
                    durationInput.value = '';
                }
                break;
            case 'sticker':
                if (selectedSticker) {
                    formattedText = format.format.replace('{desc}', selectedSticker.desc).replace('{url}', selectedSticker.url);
                }
                break;
        }
        
        if (formattedText) {
            insertIntoSillyTavern(formattedText);
        }
    });

    // 撤回按钮
    get('cip-recall-button').addEventListener('click', () => {
        insertIntoSillyTavern('--');
    });
    
    // 表情包分类与添加
    get('cip-cancel-category-btn').addEventListener('click', () => toggleModal('cip-add-category-modal', false));
    get('cip-save-category-btn').addEventListener('click', () => {
        const name = get('cip-new-category-name').value.trim();
        if (name && !stickerData[name]) { stickerData[name] = []; saveStickerData(); switchStickerCategory(name); toggleModal('cip-add-category-modal', false); }
        else if (stickerData[name]) alert('该分类已存在！'); else alert('请输入有效的分类名称！');
    });
    get('cip-cancel-stickers-btn').addEventListener('click', () => toggleModal('cip-add-stickers-modal', false));
    get('cip-save-stickers-btn').addEventListener('click', () => {
        const text = get('cip-new-stickers-input').value.trim();
        if (!currentStickerCategory || !text) return;
        text.split('\n').forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) { const desc = parts[0].trim(); const url = parts.slice(1).join(':').trim(); if (desc && url) { stickerData[currentStickerCategory].push({ desc, url }); } }
        });
        saveStickerData();
        renderStickers(currentStickerCategory);
        toggleModal('cip-add-stickers-modal', false);
    });

    // 设置面板事件
    get('cip-settings-button').addEventListener('click', () => { renderSettings(); toggleModal('cip-settings-modal', true); });
    get('cip-close-settings-btn').addEventListener('click', () => toggleModal('cip-settings-modal', false));
    get('cip-save-settings-btn').addEventListener('click', () => {
        const newFormats = [];
        get('cip-settings-list').querySelectorAll('.cip-format-item').forEach(item => {
            const id = item.dataset.id;
            const name = item.querySelector('.cip-format-name-input').value.trim();
            const formatStr = item.querySelector('.cip-format-format-input').value.trim();
            const original = formats.find(f => f.id === id) || {};
            if(name && formatStr) {
                newFormats.push({ ...original, name: name, format: formatStr });
            }
        });
        formats = newFormats;
        saveFormats();
        toggleModal('cip-settings-modal', false);
        renderAll(); // Re-render main UI
    });
    get('cip-add-format-btn').addEventListener('click', () => {
        const newId = `custom_${Date.now()}`;
        formats.push({ id: newId, name: '新种类', format: '{content}', type: 'textarea', placeholder: '在此输入内容...' });
        renderSettings();
    });

    // Emoji Picker
    emojiPicker.addEventListener('emoji-click', event => {
        const emoji = event.detail.unicode;
        const target = lastFocusedInput; // FIX: 使用最后获得焦点的输入框
        
        // FIX: 确保目标输入框存在并且在当前激活的标签页内
        if (target && target.closest('.cip-content-section.active')) {
            const { selectionStart, selectionEnd, value } = target;
            target.value = value.substring(0, selectionStart) + emoji + value.substring(selectionEnd);
            
            const newCursorPos = selectionStart + emoji.length;
            target.focus();
            target.setSelectionRange(newCursorPos, newCursorPos);
        }
        emojiPicker.style.display = 'none';
    });
    
    emojiPickerBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isVisible = emojiPicker.style.display === 'block';
        if (isVisible) { emojiPicker.style.display = 'none'; }
        else {
            const btnRect = emojiPickerBtn.getBoundingClientRect();
            let top = btnRect.top - 350 - 10;
            if (top < 10) top = btnRect.bottom + 10;
            let left = btnRect.left; // Align with button
            emojiPicker.style.top = `${top}px`;
            emojiPicker.style.left = `${left}px`;
            emojiPicker.style.display = 'block';
        }
    });

    // --- 9. 辅助函数和初始化 ---
    function insertIntoSillyTavern(t){
        const o=document.querySelector("#send_textarea");
        if(o){
            o.value+=(o.value.trim()?"\n":"")+t;
            o.dispatchEvent(new Event("input",{bubbles:!0}));
            o.focus();
        } else {
            alert("未能找到SillyTavern的输入框！");
        }
    }
    
    function showPanel() {
        if (inputPanel.classList.contains('active')) return;
        const btnRect = carrotButton.getBoundingClientRect();
        const panelHeight = inputPanel.offsetHeight || 380;
        let top = btnRect.top - panelHeight - 10;
        if (top < 10) { top = btnRect.bottom + 10; }
        let left = btnRect.left + (btnRect.width / 2) - (inputPanel.offsetWidth / 2);
        left = Math.max(10, Math.min(left, window.innerWidth - inputPanel.offsetWidth - 10));
        inputPanel.style.top = `${top}px`;
        inputPanel.style.left = `${left}px`;
        inputPanel.classList.add('active');
    }
    function hidePanel() { inputPanel.classList.remove('active'); }

    document.addEventListener('click', (e) => {
        if (inputPanel.classList.contains('active') && !inputPanel.contains(e.target) && !carrotButton.contains(e.target)) hidePanel();
        if (emojiPicker.style.display === 'block' && !emojiPicker.contains(e.target) && !emojiPickerBtn.contains(e.target)) { emojiPicker.style.display = 'none'; }
        if(get('cip-settings-modal').contains(e.target) && !get('cip-settings-modal').querySelector('.cip-modal-content').contains(e.target)) toggleModal('cip-settings-modal', false);
    });

    function dragHandler(e) {
        let isClick = true;
        if (e.type === 'touchstart') e.preventDefault();
        const rect = carrotButton.getBoundingClientRect();
        const offsetX = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - rect.left;
        const offsetY = (e.type.includes('mouse') ? e.clientY : e.touches[0].clientY) - rect.top;
        const move = (e) => {
            isClick = false;
            carrotButton.classList.add('is-dragging');
            let newLeft = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - offsetX;
            let newTop = (e.type.includes('mouse') ? e.clientY : e.touches[0].clientY) - offsetY;
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - carrotButton.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - carrotButton.offsetHeight));
            carrotButton.style.position = 'fixed';
            carrotButton.style.left = `${newLeft}px`;
            carrotButton.style.top = `${newTop}px`;
        };
        const end = () => {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', end);
            document.removeEventListener('touchmove', move);
            document.removeEventListener('touchend', end);
            carrotButton.classList.remove('is-dragging');
            if (isClick) {
                inputPanel.classList.contains('active') ? hidePanel() : showPanel();
            } else {
                localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ top: carrotButton.style.top, left: carrotButton.style.left }));
            }
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', end);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('touchend', end);
    }
    
    carrotButton.addEventListener('mousedown', dragHandler);
    carrotButton.addEventListener('touchstart', dragHandler, { passive: false });

    function loadButtonPosition() {
        const savedPos = JSON.parse(localStorage.getItem(POS_STORAGE_KEY));
        if (savedPos?.top && savedPos?.left) {
            carrotButton.style.position = 'fixed';
            carrotButton.style.top = savedPos.top;
            carrotButton.style.left = savedPos.left;
        }
    }

    function init() {
        loadFormats();
        loadStickerData();
        loadButtonPosition();
        renderAll();

        // FIX: 使用事件委托来追踪所有输入框的焦点
        get('cip-panel-content').addEventListener('focusin', (e) => {
            if (e.target.matches('.cip-input')) {
                lastFocusedInput = e.target;
            }
        });
    }
    init();
})();
