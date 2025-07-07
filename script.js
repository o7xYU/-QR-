// script.js (自定义QR插件 v1.0)
(function () {
    // 防止插件重复加载
    if (document.getElementById('cqr-main-button')) return;

    // --- 0. 全局状态和常量 ---
    const STORAGE_KEY = 'custom_qr_formats_v1';
    let formats = [];
    let currentTabId = null;
    let mainButton, mainPanel, settingsModal; // UI元素将在初始化时填充

    const defaultFormats = [
        { id: `fmt_${Date.now()}_1`, name: '文字信息', format: '“{content}”', type: 'textarea', placeholder: '在此输入文字...' },
        { id: `fmt_${Date.now()}_2`, name: '语音', format: '={duration}" | {content}=', type: 'dual_input', placeholder: '输入语音识别内容...', placeholder2: '输入时长(秒)' },
        { id: `fmt_${Date.now()}_3`, name: '作弊模式', format: '({content})', type: 'textarea', placeholder: '在此输入想对角色说的话...' },
        { id: `fmt_${Date.now()}_4`, name: '撤回', format: '--', type: 'instant' }
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

        // 主按钮
        mainButton = create('div', 'cqr-main-button', null, '✏️');
        mainButton.title = '自定义快捷输入';

        // 主面板
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

        // 设置面板 (Modal)
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

        // Emoji Picker
        const emojiPicker = create('emoji-picker', 'cqr-emoji-picker', 'cqr-frosted-glass');
        const pickerScript = document.createElement('script');
        pickerScript.type = 'module';
        pickerScript.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
        document.head.appendChild(pickerScript);

        document.body.append(mainButton, mainPanel, settingsModal, emojiPicker);
    }

    // --- 2. 数据处理 (加载/保存) ---
    function saveFormats() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formats));
    }

    function loadFormats() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            formats = JSON.parse(savedData);
        } else {
            formats = JSON.parse(JSON.stringify(defaultFormats)); // 深拷贝
            saveFormats();
        }
        // 确保总有一个可点击的标签
        if (formats.filter(f => f.type !== 'instant').length > 0) {
            currentTabId = formats.find(f => f.type !== 'instant').id;
        } else {
            currentTabId = null;
        }
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
                button.addEventListener('click', () => {
                    insertIntoSillyTavern(format.format);
                });
            } else {
                button.addEventListener('click', () => switchTab(format.id));
                if (format.id === currentTabId) {
                    button.classList.add('active');
                }
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
            if (format.id === currentTabId) {
                section.classList.add('active');
            }

            if (format.type === 'textarea') {
                section.innerHTML = `<textarea id="input-${format.id}" class="cqr-input" placeholder="${format.placeholder || ''}"></textarea>`;
            } else if (format.type === 'dual_input') {
                section.innerHTML = `
                    <input type="text" id="input2-${format.id}" class="cqr-input" style="min-height: auto; height: 30px;" placeholder="${format.placeholder2 || ''}">
                    <textarea id="input-${format.id}" class="cqr-input" placeholder="${format.placeholder || ''}"></textarea>
                `;
            }
            contentContainer.appendChild(section);
        });
    }
    
    function renderSettings() {
        const list = document.getElementById('cqr-settings-list');
        list.innerHTML = '';
        formats.forEach(format => {
            const item = document.createElement('div');
            item.className = 'cqr-format-item';
            item.dataset.id = format.id;
            item.innerHTML = `
                <input type="text" class="cqr-format-name-input" value="${format.name}" placeholder="名称">
                <input type="text" class="cqr-format-format-input" value="${format.format}" placeholder="格式, 用{content}等占位">
                <button class="cqr-delete-format-btn" title="删除此项">&times;</button>
            `;
            list.appendChild(item);
        });

        // 为新生成的删除按钮添加事件监听
        list.querySelectorAll('.cqr-delete-format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idToDelete = e.currentTarget.closest('.cqr-format-item').dataset.id;
                formats = formats.filter(f => f.id !== idToDelete);
                // 如果删除的是当前选中的tab，则切换到第一个
                if (currentTabId === idToDelete) {
                    const firstAvailable = formats.find(f => f.type !== 'instant');
                    currentTabId = firstAvailable ? firstAvailable.id : null;
                }
                renderSettings(); // 重新渲染设置列表
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
        document.querySelectorAll('.cqr-tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.id === id));
        document.querySelectorAll('.cqr-content-section').forEach(sec => sec.classList.toggle('active', sec.id === `content-${id}`));
        updateFormatDisplay();
    }

    function insertLogic() {
        const format = formats.find(f => f.id === currentTabId);
        if (!format) return;

        const mainInput = document.getElementById(`input-${format.id}`);
        const content = mainInput ? mainInput.value : '';
        let formattedText = '';

        if (format.type === 'textarea') {
            if (content.trim()) {
                formattedText = format.format.replace('{content}', content);
            }
        } else if (format.type === 'dual_input') {
            const secondaryInput = document.getElementById(`input2-${format.id}`);
            const duration = secondaryInput ? secondaryInput.value : '';
            if (content.trim() && duration.trim()) {
                formattedText = format.format.replace('{content}', content).replace('{duration}', duration);
                secondaryInput.value = '';
            }
        }

        if (formattedText) {
            insertIntoSillyTavern(formattedText);
            if (mainInput) mainInput.value = ''; // 插入后清空
        }
    }

    function insertIntoSillyTavern(text) {
        const textarea = document.querySelector("#send_textarea");
        if (textarea) {
            // 这个逻辑会添加文本并触发SillyTavern的输入事件，实现自动换行效果
            textarea.value += (textarea.value.trim() ? "\n" : "") + text;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            textarea.focus();
        } else {
            console.error("自定义QR插件: 未能找到SillyTavern的输入框！");
        }
    }

    function setupEventListeners() {
        // 主按钮拖拽和点击
        makeDraggable(mainButton, () => {
            mainPanel.classList.contains('active') ? hidePanel() : showPanel();
        });
        
        // 插入按钮
        document.getElementById('cqr-insert-button').addEventListener('click', insertLogic);

        // 设置按钮
        document.getElementById('cqr-settings-button').addEventListener('click', () => {
            renderSettings();
            settingsModal.classList.add('active');
        });
        document.getElementById('cqr-close-settings-btn').addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
        document.getElementById('cqr-save-settings-btn').addEventListener('click', () => {
            const items = document.querySelectorAll('#cqr-settings-list .cqr-format-item');
            const newFormats = [];
            items.forEach(item => {
                const id = item.dataset.id;
                const name = item.querySelector('.cqr-format-name-input').value.trim();
                const formatStr = item.querySelector('.cqr-format-format-input').value.trim();
                const originalFormat = formats.find(f => f.id === id);
                if (name && formatStr && originalFormat) {
                    newFormats.push({ ...originalFormat, name, format: formatStr });
                }
            });
            formats = newFormats;
            saveFormats();
            render(); // 保存后完全重新渲染主面板
            settingsModal.classList.remove('active');
        });
        document.getElementById('cqr-add-format-btn').addEventListener('click', () => {
            const newId = `fmt_${Date.now()}`;
            formats.push({ id: newId, name: '新种类', format: '{content}', type: 'textarea', placeholder: '在此输入内容...' });
            renderSettings(); // 重新渲染列表以显示新项
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

        // 点击外部关闭面板
        document.addEventListener('click', (e) => {
            if (mainPanel.classList.contains('active') && !mainPanel.contains(e.target) && !mainButton.contains(e.target)) {
                hidePanel();
            }
            if (emojiPicker.style.display === 'block' && !emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
                emojiPicker.style.display = 'none';
            }
            if (settingsModal.classList.contains('active') && !settingsModal.querySelector('.cqr-modal-content').contains(e.target)) {
                 settingsModal.classList.remove('active');
            }
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

    function makeDraggable(element, onClick) {
        let isDragging = false;
        let isClick = true;

        function onDown(e) {
            if (e.type === 'touchstart') e.preventDefault();
            isClick = true;
            const rect = element.getBoundingClientRect();
            const offsetX = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - rect.left;
            const offsetY = (e.type.includes('mouse') ? e.clientY : e.touches[0].clientY) - rect.top;

            function onMove(e) {
                isClick = false;
                if (!isDragging) {
                    isDragging = true;
                    element.classList.add('is-dragging');
                }
                let newLeft = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - offsetX;
                let newTop = (e.type.includes('mouse') ? e.clientY : e.touches[0].clientY) - offsetY;
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
                element.style.left = `${newLeft}px`;
                element.style.top = `${newTop}px`;
            }

            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onUp);
                element.classList.remove('is-dragging');
                if (isClick) {
                    onClick();
                } else {
                    localStorage.setItem('cqr_button_pos', JSON.stringify({ top: element.style.top, left: element.style.left }));
                }
                isDragging = false;
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onUp);
        }
        element.addEventListener('mousedown', onDown);
        element.addEventListener('touchstart', onDown, { passive: false });
    }
    
    function loadButtonPosition() {
        const savedPos = JSON.parse(localStorage.getItem('cqr_button_pos'));
        if (savedPos?.top && savedPos?.left) {
            mainButton.style.top = savedPos.top;
            mainButton.style.left = savedPos.left;
        }
    }
    
    // --- 6. 初始化 ---
    function init() {
        // 确保挂载点存在
        const anchor = document.querySelector('#chat-buttons-container, #send_form');
        if (!anchor) {
            console.error("自定义QR插件: 未能找到SillyTavern的UI挂载点，插件无法加载。");
            return;
        }
        
        // 检测暗黑模式
        if (document.body.classList.contains('dark')) {
            document.documentElement.classList.add('dark');
        }

        createUI();
        loadFormats();
        render();
        setupEventListeners();
        loadButtonPosition();
    }

    init();

})();
