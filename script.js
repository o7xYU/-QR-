// script.js (自定义QR插件 v1.1 - 集成表情包功能)
(function () {
    // 防止插件重复加载
    if (document.getElementById('cqr-main-button')) return;

    // --- 0. 全局状态和常量 ---
    const STORAGE_KEY_FORMATS = 'custom_qr_formats_v1.1';
    const STORAGE_KEY_POS = 'cqr_button_pos_v1.1';
    let formats = [];
    let currentTabId = null;
    let mainButton, mainPanel, settingsModal, addStickersModal, addCategoryModal; // UI元素
    let stickerState = { selectedSticker: null }; // 追踪当前选择的表情包

    const defaultFormats = [
        { id: `fmt_${Date.now()}_1`, name: '文字信息', format: '“{content}”', type: 'textarea', placeholder: '在此输入文字...' },
        { id: `fmt_${Date.now()}_2`, name: '语音', format: '={duration}" | {content}=', type: 'dual_input', placeholder: '输入语音识别内容...', placeholder2: '输入时长(秒)' },
        { id: `fmt_${Date.now()}_3`, name: '作弊模式', format: '({content})', type: 'textarea', placeholder: '在此输入想对角色说的话...' },
        { id: `fmt_${Date.now()}_4`, name: '撤回', format: '--', type: 'instant' },
        {
            id: `fmt_${Date.now()}_5`,
            name: '表情包',
            format: '!{desc}|{url}!',
            type: 'sticker',
            stickerData: {
                'currentCategory': '默认',
                'categories': {
                    '默认': [
                        { desc: '可爱猫猫', url: 'https://placehold.co/100x100/EAD8C0/BCA37F?text=Cat' },
                        { desc: '狗狗点头', url: 'https://placehold.co/100x100/A7D2CB/1D5D9B?text=Dog' }
                    ],
                    '搞笑': []
                }
            }
        }
    ];

    // --- 1. UI 创建 ---
    function createUI() {
        const create = (tag, id, className, html = '') => {
            const el = document.createElement(tag);
            if (id) el.id = id;
            if (className) el.className = className;
            el.innerHTML = html;
            return el;
        };

        mainButton = create('div', 'cqr-main-button', null, '✏️');
        mainButton.title = '自定义快捷输入';

        mainPanel = create('div', 'cqr-main-panel', 'cqr-frosted-glass', `
            <nav id="cqr-panel-tabs"></nav>
            <div id="cqr-format-display"></div>
            <div id="cqr-panel-content"></div>
            <div id="cqr-panel-footer">
                <button id="cqr-emoji-picker-btn">😊</button>
                <div class="cqr-footer-actions">
                    <button id="cqr-insert-button">插 入</button>
                    <button id="cqr-settings-button">⚙️</button>
                </div>
            </div>
        `);

        settingsModal = create('div', 'cqr-settings-modal', 'cqr-modal-backdrop', `
            <div class="cqr-modal-content cqr-frosted-glass">
                <h3>插件设置</h3>
                <div id="cqr-settings-list"></div>
                <div class="cqr-modal-actions">
                    <button id="cqr-add-format-btn">+ 添加种类</button>
                    <div>
                        <button id="cqr-close-settings-btn">关闭</button>
                        <button id="cqr-save-settings-btn">保存设置</button>
                    </div>
                </div>
            </div>
        `);
        
        addCategoryModal = create('div', 'cqr-add-category-modal', 'cqr-modal-backdrop', `<div class="cqr-modal-content cqr-frosted-glass" style="width: 320px;"><h3>添加新分类</h3><input type="text" id="cqr-new-category-name" class="cqr-input" placeholder="输入分类名称"><div class="cqr-modal-actions"><button id="cqr-cancel-category-btn">取消</button><button id="cqr-save-category-btn">保存</button></div></div>`);
        
        addStickersModal = create('div', 'cqr-add-stickers-modal', 'cqr-modal-backdrop', `<div class="cqr-modal-content cqr-frosted-glass" style="width: 320px;"><h3 id="cqr-add-sticker-title"></h3><p style="font-size:12px; margin:0; color:#888;">每行一个, 格式为：<code>描述:图片链接</code></p><textarea id="cqr-new-stickers-input" class="cqr-input" placeholder="可爱猫猫:https://example.com/cat.png\n狗狗点头:https://example.com/dog.gif"></textarea><div class="cqr-modal-actions"><button id="cqr-cancel-stickers-btn">取消</button><button id="cqr-save-stickers-btn">保存</button></div></div>`);

        const emojiPicker = create('emoji-picker', 'cqr-emoji-picker', 'cqr-frosted-glass');
        const pickerScript = document.createElement('script');
        pickerScript.type = 'module';
        pickerScript.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
        document.head.appendChild(pickerScript);

        document.body.append(mainButton, mainPanel, settingsModal, addCategoryModal, addStickersModal, emojiPicker);
    }

    // --- 2. 数据处理 ---
    function saveFormats() {
        localStorage.setItem(STORAGE_KEY_FORMATS, JSON.stringify(formats));
    }

    function loadFormats() {
        const savedData = localStorage.getItem(STORAGE_KEY_FORMATS);
        try {
            if (savedData) formats = JSON.parse(savedData);
            else throw new Error("No saved data");
        } catch (e) {
            formats = JSON.parse(JSON.stringify(defaultFormats));
            saveFormats();
        }
        currentTabId = formats.find(f => f.type !== 'instant')?.id || null;
    }

    // --- 3. 动态渲染 ---
    function render() {
        renderTabs();
        renderContentPanels();
        updateFormatDisplay();
    }

    function renderTabs() {
        const tabsContainer = document.getElementById('cqr-panel-tabs');
        tabsContainer.innerHTML = '';
        formats.forEach(format => {
            const button = document.createElement('button');
            button.className = 'cqr-tab-button';
            button.textContent = format.name;
            button.dataset.id = format.id;
            if (format.type === 'instant') {
                button.addEventListener('click', () => insertIntoSillyTavern(format.format));
            } else {
                button.addEventListener('click', () => switchTab(format.id));
                if (format.id === currentTabId) button.classList.add('active');
            }
            tabsContainer.appendChild(button);
        });
    }

    function renderContentPanels() {
        const contentContainer = document.getElementById('cqr-panel-content');
        contentContainer.innerHTML = '';
        formats.filter(f => f.type !== 'instant').forEach(format => {
            const section = document.createElement('div');
            section.id = `content-${format.id}`;
            section.className = 'cqr-content-section';
            if (format.id === currentTabId) section.classList.add('active');

            if (format.type === 'textarea') {
                section.innerHTML = `<textarea id="input-${format.id}" class="cqr-input" placeholder="${format.placeholder || ''}"></textarea>`;
            } else if (format.type === 'dual_input') {
                section.innerHTML = `
                    <input type="text" id="input2-${format.id}" class="cqr-input" style="min-height: auto; height: 30px;" placeholder="${format.placeholder2 || ''}">
                    <textarea id="input-${format.id}" class="cqr-input" placeholder="${format.placeholder || ''}"></textarea>`;
            } else if (format.type === 'sticker') {
                section.innerHTML = `
                    <div id="sticker-categories-${format.id}" class="cip-sub-options-container" style="padding-bottom: 8px; border-bottom: 1px solid var(--cqr-border-color); margin-bottom: 8px;"></div>
                    <div id="sticker-grid-${format.id}" class="cip-sticker-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; height: 150px; overflow-y: auto; padding: 5px; background: rgba(0,0,0,0.05); border-radius: 8px;"></div>
                `;
                // Defer rendering stickers until after the section is in the DOM
                setTimeout(() => renderStickerUI(format), 0);
            }
            contentContainer.appendChild(section);
        });
    }
    
    function renderStickerUI(format) {
        const categoriesContainer = document.getElementById(`sticker-categories-${format.id}`);
        if (!categoriesContainer) return;
        categoriesContainer.innerHTML = '';

        const categories = format.stickerData.categories;
        for (const categoryName in categories) {
            const button = document.createElement('button');
            button.className = 'cip-sub-option-btn';
            button.textContent = categoryName;
            if (categoryName === format.stickerData.currentCategory) {
                button.classList.add('active');
            }
            button.onclick = () => {
                format.stickerData.currentCategory = categoryName;
                stickerState.selectedSticker = null;
                saveFormats();
                renderStickerUI(format);
            };
            categoriesContainer.appendChild(button);
        }

        const addCategoryBtn = document.createElement('button');
        addCategoryBtn.className = 'cip-sub-option-btn';
        addCategoryBtn.textContent = '+';
        addCategoryBtn.title = '添加新分类';
        addCategoryBtn.onclick = () => openAddCategoryModal(format.id);
        categoriesContainer.appendChild(addCategoryBtn);

        const grid = document.getElementById(`sticker-grid-${format.id}`);
        const currentCategoryName = format.stickerData.currentCategory;
        const stickers = categories[currentCategoryName];
        grid.innerHTML = '';

        if (!stickers || stickers.length === 0) {
            grid.innerHTML = '<div class="cip-sticker-placeholder" style="grid-column: 1 / -1; text-align: center; color: #888; align-self: center;">此分类下没有表情包</div>';
        } else {
            stickers.forEach((sticker, index) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'cip-sticker-wrapper';
                wrapper.style.position = 'relative';
                wrapper.innerHTML = `
                    <img src="${sticker.url}" title="${sticker.desc}" class="cip-sticker-item" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid transparent;">
                    <button class="cip-delete-sticker-btn" title="删除表情" style="position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; background: var(--cqr-delete-color); color: white; border: none; border-radius: 50%; font-size: 12px; line-height: 20px; text-align: center; cursor: pointer; opacity: 0; transition: opacity 0.3s;">&times;</button>
                `;
                const img = wrapper.querySelector('img');
                img.onclick = () => {
                    grid.querySelectorAll('.cip-sticker-item.selected').forEach(el => el.classList.remove('selected'));
                    img.classList.add('selected');
                    stickerState.selectedSticker = sticker;
                };
                wrapper.querySelector('button').onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`确定要删除表情「${sticker.desc}」吗？`)) {
                        format.stickerData.categories[currentCategoryName].splice(index, 1);
                        saveFormats();
                        renderStickerUI(format);
                    }
                };
                grid.appendChild(wrapper);
            });
        }
    }
    
    function renderSettings() {
        const list = document.getElementById('cqr-settings-list');
        list.innerHTML = '';
        formats.forEach(format => {
            const item = document.createElement('div');
            item.className = 'cqr-format-item';
            item.dataset.id = format.id;
            const typeSelector = `
                <select class="cqr-format-type-select">
                    <option value="textarea" ${format.type === 'textarea' ? 'selected' : ''}>文本输入</option>
                    <option value="dual_input" ${format.type === 'dual_input' ? 'selected' : ''}>双重输入</option>
                    <option value="sticker" ${format.type === 'sticker' ? 'selected' : ''}>表情包</option>
                    <option value="instant" ${format.type === 'instant' ? 'selected' : ''}>立即插入</option>
                </select>
            `;
            item.innerHTML = `
                <input type="text" class="cqr-format-name-input" value="${format.name}" placeholder="名称">
                <input type="text" class="cqr-format-format-input" value="${format.format}" placeholder="格式, 用{content}等占位">
                ${typeSelector}
                <button class="cqr-delete-format-btn" title="删除此项">&times;</button>
            `;
            list.appendChild(item);
        });

        list.querySelectorAll('.cqr-delete-format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idToDelete = e.currentTarget.closest('.cqr-format-item').dataset.id;
                formats = formats.filter(f => f.id !== idToDelete);
                if (currentTabId === idToDelete) {
                    currentTabId = formats.find(f => f.type !== 'instant')?.id || null;
                }
                renderSettings();
            });
        });
    }

    function updateFormatDisplay() {
        const display = document.getElementById('cqr-format-display');
        const currentFormat = formats.find(f => f.id === currentTabId);
        if (currentFormat) {
            display.textContent = `格式: ${currentFormat.format}`;
        } else {
            display.textContent = '请选择一个类别';
        }
    }

    // --- 4. 核心功能与事件处理 ---
    function switchTab(id) {
        currentTabId = id;
        stickerState.selectedSticker = null; // 切换标签时重置选择
        render();
    }

    function insertLogic() {
        const format = formats.find(f => f.id === currentTabId);
        if (!format) return;

        let formattedText = '';
        if (format.type === 'sticker') {
            if (stickerState.selectedSticker) {
                formattedText = format.format
                    .replace('{desc}', stickerState.selectedSticker.desc)
                    .replace('{url}', stickerState.selectedSticker.url);
            }
        } else {
            const mainInput = document.getElementById(`input-${format.id}`);
            const content = mainInput ? mainInput.value : '';
            if (format.type === 'textarea') {
                if (content.trim()) formattedText = format.format.replace('{content}', content);
            } else if (format.type === 'dual_input') {
                const secondaryInput = document.getElementById(`input2-${format.id}`);
                const duration = secondaryInput ? secondaryInput.value : '';
                if (content.trim() && duration.trim()) {
                    formattedText = format.format.replace('{content}', content).replace('{duration}', duration);
                    if(secondaryInput) secondaryInput.value = '';
                }
            }
            if (formattedText && mainInput) mainInput.value = '';
        }

        if (formattedText) insertIntoSillyTavern(formattedText);
    }

    function insertIntoSillyTavern(text) {
        const textarea = document.querySelector("#send_textarea");
        if (textarea) {
            textarea.value += (textarea.value.trim() ? "\n" : "") + text;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            textarea.focus();
        } else {
            console.error("自定义QR插件: 未能找到SillyTavern的输入框！");
        }
    }

    function setupEventListeners() {
        makeDraggable(mainButton, () => mainPanel.classList.contains('active') ? hidePanel() : showPanel());
        document.getElementById('cqr-insert-button').addEventListener('click', insertLogic);
        
        // Settings Modal
        document.getElementById('cqr-settings-button').addEventListener('click', () => {
            renderSettings();
            settingsModal.classList.add('active');
        });
        document.getElementById('cqr-close-settings-btn').addEventListener('click', () => settingsModal.classList.remove('active'));
        document.getElementById('cqr-save-settings-btn').addEventListener('click', () => {
            const newFormats = [];
            document.querySelectorAll('#cqr-settings-list .cqr-format-item').forEach(item => {
                const id = item.dataset.id;
                const name = item.querySelector('.cqr-format-name-input').value.trim();
                const formatStr = item.querySelector('.cqr-format-format-input').value.trim();
                const type = item.querySelector('.cqr-format-type-select').value;
                const originalFormat = formats.find(f => f.id === id) || {};

                if (name && formatStr) {
                    const newFormat = { ...originalFormat, id, name, format: formatStr, type };
                    // If type changed to sticker, initialize stickerData
                    if (type === 'sticker' && !newFormat.stickerData) {
                        newFormat.stickerData = JSON.parse(JSON.stringify(defaultFormats.find(f=>f.type==='sticker').stickerData));
                    }
                    newFormats.push(newFormat);
                }
            });
            formats = newFormats;
            if (!formats.find(f => f.id === currentTabId)) {
                currentTabId = formats.find(f => f.type !== 'instant')?.id || null;
            }
            saveFormats();
            render();
            settingsModal.classList.remove('active');
        });
        document.getElementById('cqr-add-format-btn').addEventListener('click', () => {
            const newId = `fmt_${Date.now()}`;
            formats.push({ id: newId, name: '新种类', format: '{content}', type: 'textarea', placeholder: '在此输入内容...' });
            renderSettings();
        });

        // Sticker Modals
        document.getElementById('cqr-cancel-category-btn').addEventListener('click', () => addCategoryModal.classList.remove('active'));
        document.getElementById('cqr-save-category-btn').addEventListener('click', () => {
            const formatId = addCategoryModal.dataset.formatId;
            const format = formats.find(f => f.id === formatId);
            const newName = document.getElementById('cqr-new-category-name').value.trim();
            if (format && newName && !format.stickerData.categories[newName]) {
                format.stickerData.categories[newName] = [];
                format.stickerData.currentCategory = newName;
                saveFormats();
                renderStickerUI(format);
                addCategoryModal.classList.remove('active');
            }
        });
        document.getElementById('cqr-cancel-stickers-btn').addEventListener('click', () => addStickersModal.classList.remove('active'));
        document.getElementById('cqr-save-stickers-btn').addEventListener('click', () => {
            const {formatId, category} = addStickersModal.dataset;
            const format = formats.find(f => f.id === formatId);
            const text = document.getElementById('cqr-new-stickers-input').value.trim();
            if (!format || !category || !text) return;
            
            text.split('\n').forEach(line => {
                const parts = line.split(':');
                if (parts.length >= 2) {
                    const desc = parts[0].trim();
                    const url = parts.slice(1).join(':').trim();
                    if (desc && url) format.stickerData.categories[category].push({ desc, url });
                }
            });
            saveFormats();
            renderStickerUI(format);
            addStickersModal.classList.remove('active');
        });

        // Emoji Picker
        const emojiPicker = document.getElementById('cqr-emoji-picker');
        const emojiBtn = document.getElementById('cqr-emoji-picker-btn');
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = emojiPicker.style.display === 'block';
            if (isVisible) {
                emojiPicker.style.display = 'none';
            } else {
                const btnRect = emojiBtn.getBoundingClientRect();
                emojiPicker.style.top = `${btnRect.top - 350 - 10}px`;
                emojiPicker.style.left = `${btnRect.left}px`;
                emojiPicker.style.display = 'block';
            }
        });
        emojiPicker.addEventListener('emoji-click', event => {
            const input = document.querySelector(`#content-${currentTabId} .cqr-input`);
            if (input) {
                const emoji = event.detail.unicode;
                const { selectionStart, selectionEnd, value } = input;
                input.value = value.substring(0, selectionStart) + emoji + value.substring(selectionEnd);
                input.focus();
                input.selectionEnd = selectionStart + emoji.length;
            }
            emojiPicker.style.display = 'none';
        });

        // Global click listener to close popups
        document.addEventListener('click', (e) => {
            if (mainPanel.classList.contains('active') && !mainPanel.contains(e.target) && !mainButton.contains(e.target)) hidePanel();
            if (emojiPicker.style.display === 'block' && !emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) emojiPicker.style.display = 'none';
            if (settingsModal.classList.contains('active') && !settingsModal.querySelector('.cqr-modal-content').contains(e.target)) settingsModal.classList.remove('active');
        });
    }

    // --- 5. 辅助函数 ---
    function showPanel() {
        const btnRect = mainButton.getBoundingClientRect();
        const panelHeight = mainPanel.offsetHeight || 400;
        let top = btnRect.top - panelHeight - 10;
        if (top < 10) top = btnRect.bottom + 10;
        let left = btnRect.left + (btnRect.width / 2) - (mainPanel.offsetWidth / 2);
        left = Math.max(10, Math.min(left, window.innerWidth - mainPanel.offsetWidth - 10));
        mainPanel.style.top = `${top}px`;
        mainPanel.style.left = `${left}px`;
        mainPanel.classList.add('active');
    }

    function hidePanel() {
        mainPanel.classList.remove('active');
    }
    
    function openAddCategoryModal(formatId) {
        addCategoryModal.dataset.formatId = formatId;
        document.getElementById('cqr-new-category-name').value = '';
        addCategoryModal.classList.add('active');
    }
    
    function openAddStickersModal(formatId, category) {
        addStickersModal.dataset.formatId = formatId;
        addStickersModal.dataset.category = category;
        document.getElementById('cqr-add-sticker-title').textContent = `为「${category}」添加表情`;
        document.getElementById('cqr-new-stickers-input').value = '';
        addStickersModal.classList.add('active');
    }

    function makeDraggable(element, onClick) {
        let isClick = true;
        function onDown(e) {
            if (e.type === 'touchstart') e.preventDefault();
            isClick = true;
            const rect = element.getBoundingClientRect();
            const offsetX = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - rect.left;
            const offsetY = (e.type.includes('mouse') ? e.clientY : e.touches[0].clientY) - rect.top;
            
            function onMove(e) { isClick = false; element.classList.add('is-dragging'); /* ... move logic ... */ 
                let newLeft = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - offsetX;
                let newTop = (e.type.includes('mouse') ? e.clientY : e.touches[0].clientY) - offsetY;
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
                element.style.left = `${newLeft}px`;
                element.style.top = `${newTop}px`;
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
                document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp);
                element.classList.remove('is-dragging');
                if (isClick) onClick();
                else localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ top: element.style.top, left: element.style.left }));
            }
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
            document.addEventListener('touchmove', onMove, { passive: false }); document.addEventListener('touchend', onUp);
        }
        element.addEventListener('mousedown', onDown); element.addEventListener('touchstart', onDown, { passive: false });
    }
    
    function loadButtonPosition() {
        const savedPos = JSON.parse(localStorage.getItem(STORAGE_KEY_POS));
        if (savedPos?.top && savedPos?.left) {
            mainButton.style.top = savedPos.top;
            mainButton.style.left = savedPos.left;
        }
    }
    
    // --- 6. 初始化 ---
    function init() {
        const anchor = document.querySelector('#chat-buttons-container, #send_form');
        if (!anchor) {
            console.error("自定义QR插件: 未能找到SillyTavern的UI挂载点，插件无法加载。");
            return;
        }
        if (document.body.classList.contains('dark')) document.documentElement.classList.add('dark');

        createUI();
        loadFormats();
        render();
        setupEventListeners();
        loadButtonPosition();
    }

    init();

})();
