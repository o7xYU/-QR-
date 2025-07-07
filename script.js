// script.js (v1.0.2)
(function () {
    if (document.getElementById('cip-carrot-button')) {
        console.log('自定义QR插件：胡萝卜按钮已存在，跳过初始化');
        return;
    }

    // 加载 Emoji Picker 库
    const pickerScript = document.createElement('script');
    pickerScript.type = 'module';
    pickerScript.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
    document.head.appendChild(pickerScript);

    // 创建 UI 元素
    function createUI() {
        const create = (tag, id, className, html) => {
            const el = document.createElement(tag);
            if (id) el.id = id;
            if (className) el.className = className;
            if (html) el.innerHTML = html;
            return el;
        };
        const carrotButton = create('div', 'cip-carrot-button', null, '🥕');
        carrotButton.title = '自定义QR输入';

        const inputPanel = create('div', 'cip-input-panel', 'cip-frosted-glass', `
            <nav id="cip-panel-tabs"></nav>
            <div id="cip-format-display"></div>
            <div id="cip-panel-content"></div>
            <div id="cip-panel-footer">
                <div id="cip-emoji-picker-btn">😊</div>
                <div id="cip-settings-btn">⚙️</div>
                <div class="cip-footer-actions">
                    <button id="cip-recall-button">撤回</button>
                    <button id="cip-insert-button">插入</button>
                </div>
            </div>
        `);

        const settingsPanel = create('div', 'cip-settings-panel', 'cip-frosted-glass', `
            <h3>格式设置</h3>
            <div id="cip-settings-tabs"></div>
            <div id="cip-settings-content"></div>
            <button id="cip-add-tab-btn" class="cip-sub-option-btn">+</button>
        `);

        const emojiPicker = create('emoji-picker', 'cip-emoji-picker', 'cip-frosted-glass');
        const addCategoryModal = create('div', 'cip-add-category-modal', 'cip-modal-backdrop hidden', `
            <div class="cip-modal-content cip-frosted-glass">
                <h3>添加新分类</h3>
                <rollup-input type="text" id="cip-new-category-name" placeholder="输入分类名称">
                <div class="cip-modal-actions">
                    <button id="cip-cancel-category-btn">取消</button>
                    <button id="cip-save-category-btn">保存</button>
                </div>
            </div>
        `);
        const addStickersModal = create('div', 'cip-add-stickers-modal', 'cip-modal-backdrop hidden', `
            <div class="cip-modal-content cip-frosted-glass">
                <h3 id="cip-add-sticker-title"></h3>
                <p>每行一个，格式为：<br><code>表情包描述:图片链接</code></p>
                <textarea id="cip-new-stickers-input" placeholder="可爱猫猫:https://example.com/cat.png\n狗狗点头:https://example.com/dog.gif"></textarea>
                <div class="cip-modal-actions">
                    <button id="cip-cancel-stickers-btn">取消</button>
                    <button id="cip-save-stickers-btn">保存</button>
                </div>
            </div>
        `);
        const addTabModal = create('div', 'cip-add-tab-modal', 'cip-modal-backdrop hidden', `
            <div class="cip-modal-content cip-frosted-glass">
                <h3>添加新类型</h3>
                <input type="text" id="cip-new-tab-name" placeholder="输入类型名称">
                <input type="text" id="cip-new-tab-format" placeholder="输入格式 (使用 {content} 占位)">
                <div class="cip-modal-actions">
                    <button id="cip-cancel-tab-btn">取消</button>
                    <button id="cip-save-tab-btn">保存</button>
                </div>
            </div>
        `);
        return { carrotButton, inputPanel, settingsPanel, emojiPicker, addCategoryModal, addStickersModal, addTabModal };
    }

    // 注入 UI
    const { carrotButton, inputPanel, settingsPanel, emojiPicker, addCategoryModal, addStickersModal, addTabModal } = createUI();
    const anchor = document.querySelector('#chat-buttons-container, #send_form');
    if (anchor) {
        console.log('自定义QR插件：找到UI挂载点，注入胡萝卜按钮');
        document.body.appendChild(carrotButton);
        document.body.appendChild(inputPanel);
        document.body.appendChild(settingsPanel);
        document.body.appendChild(emojiPicker);
        document.body.appendChild(addCategoryModal);
        document.body.appendChild(addStickersModal);
        document.body.appendChild(addTabModal);
    } else {
        console.error('自定义QR插件：未能找到SillyTavern的UI挂载点，尝试直接注入到body');
        document.body.appendChild(carrotButton);
        document.body.appendChild(inputPanel);
        document.body.appendChild(settingsPanel);
        document.body.appendChild(emojiPicker);
        document.body.appendChild(addCategoryModal);
        document.body.appendChild(addStickersModal);
        document.body.appendChild(addTabModal);
    }

    // 获取元素引用
    const get = (id) => document.getElementById(id);
    const queryAll = (sel) => document.querySelectorAll(sel);
    const formatDisplay = get('cip-format-display'), insertButton = get('cip-insert-button'), recallButton = get('cip-recall-button');
    const panelTabs = get('cip-panel-tabs'), panelContent = get('cip-panel-content');
    const settingsTabs = get('cip-settings-tabs'), settingsContent = get('cip-settings-content');
    const addTabBtn = get('cip-add-tab-btn');
    const stickerCategoriesContainer = get('cip-sticker-categories'), addCategoryBtn = get('cip-add-category-btn'), stickerGrid = get('cip-sticker-grid');
    const emojiPickerBtn = get('cip-emoji-picker-btn'), settingsBtn = get('cip-settings-btn');
    const saveCategoryBtn = get('cip-save-category-btn'), cancelCategoryBtn = get('cip-cancel-category-btn'), newCategoryNameInput = get('cip-new-category-name');
    const addStickerTitle = get('cip-add-sticker-title'), saveStickersBtn = get('cip-save-stickers-btn'), cancelStickersBtn = get('cip-cancel-stickers-btn'), newStickersInput = get('cip-new-stickers-input');
    const saveTabBtn = get('cip-save-tab-btn'), cancelTabBtn = get('cip-cancel-tab-btn'), newTabNameInput = get('cip-new-tab-name'), newTabFormatInput = get('cip-new-tab-format');

    // 核心逻辑
    let currentTab = 'text', currentTextSubType = 'plain', stickerData = {}, currentStickerCategory = '', selectedSticker = null;
    const protectedTabs = ['text', 'voice', 'stickers'];
    let formatTemplates = {
        text: { plain: '“{content}”', image: '“[{content}.jpg]”', video: '“[{content}.mp4]”', music: '“[{content}.mp3]”', post: '“[{content}.link]”' },
        voice: "={duration}'|{message}=",
        cheat: "({content})",
        stickers: "!{desc}|{url}!",
        recall: '--'
    };

    function saveFormats() {
        localStorage.setItem('cip_format_templates', JSON.stringify(formatTemplates));
    }

    function loadFormats() {
        const saved = localStorage.getItem('cip_format_templates');
        if (saved) {
            const loaded = JSON.parse(saved);
            formatTemplates = { ...formatTemplates, ...loaded, text: { ...formatTemplates.text, ...loaded.text } };
        }
    }

    function renderTabs() {
        panelTabs.innerHTML = '';
        settingsTabs.innerHTML = '';
        panelContent.innerHTML = '';
        settingsContent.innerHTML = '';

        Object.keys(formatTemplates).forEach(tab => {
            if (tab === 'recall') return;

            // 主面板标签
            const tabBtn = document.createElement('button');
            tabBtn.className = `cip-tab-button${tab === currentTab ? ' active' : ''}`;
            tabBtn.dataset.tab = tab;
            tabBtn.textContent = tab === 'cheat' ? '作弊模式' : tab === 'text' ? '文字信息' : tab === 'voice' ? '语音' : tab === 'stickers' ? '表情包' : tab;
            tabBtn.onclick = () => switchTab(tab);
            if (!protectedTabs.includes(tab)) {
                const deleteBtn = document.createElement('i');
                deleteBtn.textContent = '🗑️';
                deleteBtn.className = 'cip-category-action-icon cip-delete-tab-btn';
                deleteBtn.title = `删除 ${tab} 类型`;
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`确定删除「${tab}」类型？`)) {
                        delete formatTemplates[tab];
                        saveFormats();
                        renderTabs();
                        switchTab(Object.keys(formatTemplates).find(t => t !== 'recall') || 'text');
                    }
                };
                tabBtn.appendChild(deleteBtn);
            }
            panelTabs.appendChild(tabBtn);

            // 设置面板标签
            const settingsTabBtn = document.createElement('button');
            settingsTabBtn.className = `cip-tab-button${tab === currentTab ? ' active' : ''}`;
            settingsTabBtn.dataset.tab = tab;
            settingsTabBtn.textContent = tab === 'cheat' ? '作弊模式' : tab === 'text' ? '文字信息' : tab === 'voice' ? '语音' : tab === 'stickers' ? '表情包' : tab;
            settingsTabBtn.onclick = () => switchSettingsTab(tab);
            settingsTabs.appendChild(settingsTabBtn);

            // 主面板内容
            let contentHtml = '';
            if (tab === 'text') {
                contentHtml = `
                    <div id="cip-text-content" class="cip-content-section${tab === currentTab ? ' active' : ''}">
                        <div class="cip-sub-options-container">
                            <button class="cip-sub-option-btn${currentTextSubType === 'plain' ? ' active' : ''}" data-type="plain">纯文本</button>
                            <button class="cip-sub-option-btn${currentTextSubType === 'image' ? ' active' : ''}" data-type="image">图片</button>
                            <button class="cip-sub-option-btn${currentTextSubType === 'video' ? ' active' : ''}" data-type="video">视频</button>
                            <button class="cip-sub-option-btn${currentTextSubType === 'music' ? ' active' : ''}" data-type="music">音乐</button>
                            <button class="cip-sub-option-btn${currentTextSubType === 'post' ? ' active' : ''}" data-type="post">帖子</button>
                        </div>
                        <textarea id="cip-main-input" placeholder="在此输入文字..."></textarea>
                    </div>`;
            } else if (tab === 'voice') {
                contentHtml = `
                    <div id="cip-voice-content" class="cip-content-section${tab === currentTab ? ' active' : ''}">
                        <input type="number" id="cip-voice-duration" placeholder="输入时长 (秒, 仅数字)">
                        <textarea id="cip-voice-message" placeholder="输入语音识别出的内容..."></textarea>
                    </div>`;
            } else if (tab === 'stickers') {
                contentHtml = `
                    <div id="cip-stickers-content" class="cip-content-section${tab === currentTab ? ' active' : ''}">
                        <div id="cip-sticker-categories" class="cip-sub-options-container">
                            <button id="cip-add-category-btn" class="cip-sub-option-btn">+</button>
                        </div>
                        <div id="cip-sticker-grid"></div>
                    </div>`;
            } else {
                contentHtml = `
                    <div id="cip-${tab}-content" class="cip-content-section${tab === currentTab ? ' active' : ''}">
                        <textarea id="cip-${tab}-input" placeholder="在此输入内容..."></textarea>
                    </div>`;
            }
            panelContent.insertAdjacentHTML('beforeend', contentHtml);

            // 设置面板内容
            let settingsContentHtml = '';
            if (tab === 'text') {
                settingsContentHtml = `
                    <div id="cip-settings-${tab}-content" class="cip-content-section${tab === currentTab ? ' active' : ''}">
                        <div class="cip-sub-options-container">
                            <button class="cip-sub-option-btn${currentTextSubType === 'plain' ? ' active' : ''}" data-type="plain">纯文本</button>
                            <button class="cip-sub-option-btn${currentTextSubType === 'image' ? ' active' : ''}" data-type="image">图片</button>
                            <button class="cip-sub-option-btn${currentTextSubType === 'video' ? ' active' : ''}" data-type="video">视频</button>
                            <button class="cip-sub-option-btn${currentTextSubType === 'music' ? ' active' : ''}" data-type="music">音乐</button>
                            <button class="cip-sub-option-btn${currentTextSubType === 'post' ? ' active' : ''}" data-type="post">帖子</button>
                        </div>
                        <input type="text" id="cip-format-template-input" placeholder="输入格式 (使用 {content} 占位)">
                    </div>`;
            } else if (tab === 'voice') {
                settingsContentHtml = `
                    <div id="cip-settings-${tab}-content" class="cip-content-section${tab === currentTab ? ' active' : ''}">
                        <input type="text" id="cip-format-template-input" placeholder="输入格式 (使用 {duration} 和 {message} 占位)">
                    </div>`;
            } else if (tab === 'stickers') {
                settingsContentHtml = `
                    <div id="cip-settings-${tab}-content" class="cip-content-section${tab === currentTab ? ' active' : ''}">
                        <input type="text" id="cip-format-template-input" placeholder="输入格式 (使用 {desc} 和 {url} 占位)">
                    </div>`;
            } else {
                settingsContentHtml = `
                    <div id="cip-settings-${tab}-content" class="cip-content-section${tab === currentTab ? ' active' : ''}">
                        <input type="text" id="cip-format-template-input" placeholder="输入格式 (使用 {content} 占位)">
                    </div>`;
            }
            settingsContent.insertAdjacentHTML('beforeend', settingsContentHtml);
        });

        queryAll('#cip-text-content .cip-sub-option-btn').forEach(btn => btn.onclick = () => switchTextSubType(btn.dataset.type));
        queryAll('#cip-settings-text-content .cip-sub-option-btn').forEach(btn => btn.onclick = () => {
            currentTextSubType = btn.dataset.type;
            queryAll('#cip-settings-text-content .cip-sub-option-btn').forEach(b => b.classList.toggle('active', b.dataset.type === currentTextSubType));
            updateSettingsFormatInput();
        });
    }

    function updateFormatDisplay() {
        const e = get("cip-input-panel").querySelector(`.cip-sticker-category-btn[data-category="${currentStickerCategory}"]`);
        queryAll(".cip-category-action-icon").forEach(e => e.remove());
        switch (currentTab) {
            case 'text':
                formatDisplay.textContent = `格式: ${formatTemplates.text[currentTextSubType].replace("{content}", "内容")}`;
                break;
            case 'voice':
                formatDisplay.textContent = `格式: ${formatTemplates.voice.replace("{duration}", "数字").replace("{message}", "内容")}`;
                break;
            case 'stickers':
                formatDisplay.textContent = `格式: ${formatTemplates.stickers.replace("{desc}", "描述").replace("{url}", "链接")}`;
                if (e) {
                    const t = document.createElement("i");
                    t.textContent = " ➕";
                    t.className = "cip-category-action-icon";
                    t.title = "向此分类添加表情包";
                    t.onclick = t => { t.stopPropagation(); openAddStickersModal(currentStickerCategory); };
                    e.appendChild(t);
                    const o = document.createElement("i");
                    o.textContent = " 🗑️";
                    o.className = "cip-category-action-icon cip-delete-category-btn";
                    o.title = "删除此分类";
                    o.onclick = t => {
                        t.stopPropagation();
                        confirm(`确定删除「${currentStickerCategory}」分类?`) && (delete stickerData[currentStickerCategory], saveStickerData(), renderCategories(), switchStickerCategory(Object.keys(stickerData)[0] || ""));
                    };
                    e.appendChild(o);
                }
                break;
            default:
                formatDisplay.textContent = `格式: ${formatTemplates[currentTab].replace("{content}", "内容")}`;
        }
    }

    function updateSettingsFormatInput() {
        const input = get('cip-format-template-input');
        if (currentTab === 'text') {
            input.value = formatTemplates.text[currentTextSubType];
        } else {
            input.value = formatTemplates[currentTab];
        }
        input.oninput = () => {
            if (currentTab === 'text') {
                formatTemplates.text[currentTextSubType] = input.value;
            } else {
                formatTemplates[currentTab] = input.value;
            }
            saveFormats();
            updateFormatDisplay();
        };
    }

    function switchTab(t) {
        currentTab = t;
        queryAll(".cip-tab-button").forEach(e => e.classList.toggle("active", e.dataset.tab === t));
        queryAll(".cip-content-section").forEach(e => e.classList.toggle("active", e.id === `cip-${t}-content`));
        const o = Object.keys(stickerData)[0];
        if (t === 'stickers' && (!currentStickerCategory && o)) switchStickerCategory(o);
        updateFormatDisplay();
    }

    function switchSettingsTab(t) {
        currentTab = t;
        queryAll("#cip-settings-tabs .cip-tab-button").forEach(e => e.classList.toggle("active", e.dataset.tab === t));
        queryAll("#cip-settings-content .cip-content-section").forEach(e => e.classList.toggle("active", e.id === `cip-settings-${t}-content`));
        updateSettingsFormatInput();
    }

    function switchTextSubType(t) {
        currentTextSubType = t;
        queryAll("#cip-text-content .cip-sub-option-btn").forEach(e => e.classList.toggle("active", e.dataset.type === t));
        updateFormatDisplay();
    }

    function switchStickerCategory(t) {
        currentStickerCategory = t;
        queryAll(".cip-sticker-category-btn").forEach(e => e.classList.toggle("active", e.dataset.category === t));
        renderStickers(t);
        selectedSticker = null;
        updateFormatDisplay();
    }

    function renderStickers(t) {
        stickerGrid.innerHTML = "";
        if (!t || !stickerData[t]) {
            stickerGrid.innerHTML = '<div class="cip-sticker-placeholder">请先选择或添加一个分类...</div>';
            return;
        }
        const stickers = stickerData[t];
        if (stickers.length === 0) {
            stickerGrid.innerHTML = '<div class="cip-sticker-placeholder">这个分类还没有表情包...</div>';
            return;
        }
        stickers.forEach((sticker, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "cip-sticker-wrapper";
            const img = document.createElement("img");
            img.src = sticker.url;
            img.title = sticker.desc;
            img.className = "cip-sticker-item";
            img.onclick = () => {
                queryAll(".cip-sticker-item.selected").forEach(e => e.classList.remove("selected"));
                img.classList.add("selected");
                selectedSticker = sticker;
            };
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "×";
            deleteBtn.className = "cip-delete-sticker-btn";
            deleteBtn.title = "删除这个表情包";
            deleteBtn.onclick = e => {
                e.stopPropagation();
                if (confirm(`确定删除表情「${sticker.desc}」?`)) {
                    stickerData[currentStickerCategory].splice(index, 1);
                    saveStickerData();
                    renderStickers(currentStickerCategory);
                }
            };
            wrapper.appendChild(img);
            wrapper.appendChild(deleteBtn);
            stickerGrid.appendChild(wrapper);
        });
    }

    function renderCategories() {
        queryAll(".cip-sticker-category-btn").forEach(e => e.remove());
        Object.keys(stickerData).forEach(category => {
            const btn = document.createElement("button");
            const span = document.createElement("span");
            span.textContent = category;
            btn.appendChild(span);
            btn.className = "cip-sub-option-btn cip-sticker-category-btn";
            btn.dataset.category = category;
            btn.onclick = () => switchStickerCategory(category);
            stickerCategoriesContainer.appendChild(btn);
        });
    }

    function insertIntoSillyTavern(text) {
        const textarea = document.querySelector("#send_textarea");
        if (textarea) {
            textarea.value += (textarea.value.trim() ? "\n" : "") + text;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            textarea.focus();
        } else {
            alert("未能找到SillyTavern的输入框！");
        }
    }

    function saveStickerData() {
        localStorage.setItem("cip_sticker_data", JSON.stringify(stickerData));
    }

    function loadStickerData() {
        const data = localStorage.getItem("cip_sticker_data");
        if (data) {
            stickerData = JSON.parse(data);
        }
    }

    function toggleModal(id, show) {
        get(id).classList.toggle("hidden", !show);
    }

    function openAddStickersModal(category) {
        addStickerTitle.textContent = `为「${category}」分类添加表情包`;
        newStickersInput.value = "";
        addStickersModal.dataset.currentCategory = category;
        toggleModal("cip-add-stickers-modal", true);
        newStickersInput.focus();
    }

    emojiPicker.addEventListener('emoji-click', event => {
        const emoji = event.detail.unicode;
        let target = get(`cip-${currentTab}-input`) || get('cip-main-input') || get('cip-voice-message');
        if (target) {
            const { selectionStart, selectionEnd, value } = target;
            target.value = value.substring(0, selectionStart) + emoji + value.substring(selectionEnd);
            target.focus();
            target.selectionEnd = selectionStart + emoji.length;
        }
        emojiPicker.style.display = 'none';
    });

    emojiPickerBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isVisible = emojiPicker.style.display === 'block';
        if (isVisible) {
            emojiPicker.style.display = 'none';
        } else {
            const btnRect = emojiPickerBtn.getBoundingClientRect();
            let top = btnRect.top - 350 - 10;
            if (top < 10) top = btnRect.bottom + 10;
            emojiPicker.style.top = `${top}px`;
            emojiPicker.style.left = `${btnRect.left}px`;
            emojiPicker.style.display = 'block';
        }
    });

    settingsBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isVisible = settingsPanel.style.display === 'block';
        if (isVisible) {
            settingsPanel.style.display = 'none';
        } else {
            const btnRect = settingsBtn.getBoundingClientRect();
            let top = btnRect.top - 350 - 10;
            if (top < 10) top = btnRect.bottom + 10;
            settingsPanel.style.top = `${top}px`;
            settingsPanel.style.left = `${btnRect.left}px`;
            settingsPanel.style.display = 'block';
            updateSettingsFormatInput();
        }
    });

    queryAll('.cip-tab-button').forEach(button => button.addEventListener('click', (e) => switchTab(e.currentTarget.dataset.tab)));
    recallButton.addEventListener('click', () => insertIntoSillyTavern(formatTemplates.recall));

    insertButton.addEventListener('click', () => {
        let formattedText = '';
        let inputToClear = null;

        switch (currentTab) {
            case 'text':
                const mainInput = get('cip-main-input');
                if (mainInput.value.trim()) {
                    formattedText = formatTemplates.text[currentTextSubType].replace('{content}', mainInput.value);
                    inputToClear = mainInput;
                }
                break;
            case 'voice':
                const voiceDurationInput = get('cip-voice-duration');
                const voiceMessageInput = get('cip-voice-message');
                if (voiceDurationInput.value.trim() && voiceMessageInput.value.trim()) {
                    formattedText = formatTemplates.voice.replace('{duration}', voiceDurationInput.value).replace('{message}', voiceMessageInput.value);
                    inputToClear = voiceMessageInput;
                    voiceDurationInput.value = '';
                }
                break;
            case 'stickers':
                if (selectedSticker) {
                    formattedText = formatTemplates.stickers.replace('{desc}', selectedSticker.desc).replace('{url}', selectedSticker.url);
                }
                break;
            default:
                const customInput = get(`cip-${currentTab}-input`);
                if (customInput.value.trim()) {
                    formattedText = formatTemplates[currentTab].replace('{content}', customInput.value);
                    inputToClear = customInput;
                }
        }

        if (formattedText) {
            insertIntoSillyTavern(formattedText);
            if (inputToClear) {
                inputToClear.value = '';
            }
        }
    });

    addCategoryBtn.addEventListener('click', () => {
        newCategoryNameInput.value = '';
        toggleModal('cip-add-category-modal', true);
        newCategoryNameInput.focus();
    });

    cancelCategoryBtn.addEventListener('click', () => toggleModal('cip-add-category-modal', false));

    saveCategoryBtn.addEventListener('click', () => {
        const name = newCategoryNameInput.value.trim();
        if (name && !stickerData[name]) {
            stickerData[name] = [];
            saveStickerData();
            renderCategories();
            switchStickerCategory(name);
            toggleModal('cip-add-category-modal', false);
        } else if (stickerData[name]) {
            alert('该分类已存在！');
        } else {
            alert('请输入有效的分类名称！');
        }
    });

    cancelStickersBtn.addEventListener('click', () => toggleModal('cip-add-stickers-modal', false));

    saveStickersBtn.addEventListener('click', () => {
        const category = addStickersModal.dataset.currentCategory;
        const text = newStickersInput.value.trim();
        if (!category || !text) return;
        let addedCount = 0;
        text.split('\n').forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
                const desc = parts[0].trim();
                const url = parts.slice(1).join(':').trim();
                if (desc && url) {
                    stickerData[category].push({ desc, url });
                    addedCount++;
                }
            }
        });
        if (addedCount > 0) {
            saveStickerData();
            if (currentStickerCategory === category) renderStickers(category);
            toggleModal('cip-add-stickers-modal', false);
        } else {
            alert('未能解析任何有效的表情包信息。');
        }
    });

    addTabBtn.addEventListener('click', () => {
        newTabNameInput.value = '';
        newTabFormatInput.value = '';
        toggleModal('cip-add-tab-modal', true);
        newTabNameInput.focus();
    });

    cancelTabBtn.addEventListener('click', () => toggleModal('cip-add-tab-modal', false));

    saveTabBtn.addEventListener('click', () => {
        const name = newTabNameInput.value.trim();
        const format = newTabFormatInput.value.trim();
        if (name && format && !formatTemplates[name] && !protectedTabs.includes(name)) {
            formatTemplates[name] = format;
            saveFormats();
            renderTabs();
            switchTab(name);
            toggleModal('cip-add-tab-modal', false);
        } else if (formatTemplates[name] || protectedTabs.includes(name)) {
            alert('该类型已存在或为保留类型！');
        } else {
            alert('请输入有效的类型名称和格式！');
        }
    });

    function showPanel() {
        if (inputPanel.classList.contains('active')) return;
        const btnRect = carrotButton.getBoundingClientRect();
        const panelHeight = inputPanel.offsetHeight || 380;
        let top = btnRect.top - panelHeight - 10;
        if (top < 10) {
            top = btnRect.bottom + 10;
        }
        let left = btnRect.left + (btnRect.width / 2) - (inputPanel.offsetWidth / 2);
        left = Math.max(10, Math.min(left, window.innerWidth - inputPanel.offsetWidth - 10));
        inputPanel.style.top = `${top}px`;
        inputPanel.style.left = `${left}px`;
        inputPanel.classList.add('active');
        console.log('自定义QR插件：显示输入面板');
    }

    function hidePanel() {
        inputPanel.classList.remove('active');
        settingsPanel.style.display = 'none';
        emojiPicker.style.display = 'none';
        console.log('自定义QR插件：隐藏输入面板');
    }

    document.addEventListener('click', (e) => {
        if (inputPanel.classList.contains('active') && !inputPanel.contains(e.target) && !carrotButton.contains(e.target)) {
            hidePanel();
        }
        if (emojiPicker.style.display === 'block' && !emojiPicker.contains(e.target) && !emojiPickerBtn.contains(e.target)) {
            emojiPicker.style.display = 'none';
        }
        if (settingsPanel.style.display === 'block' && !settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
            settingsPanel.style.display = 'none';
        }
    });

    function dragHandler(e) {
        let isClick = true;
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
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
            console.log(`自定义QR插件：拖动胡萝卜按钮到 (${newLeft}px, ${newTop}px)`);
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
                localStorage.setItem('cip_button_position_v4', JSON.stringify({ top: carrotButton.style.top, left: carrotButton.style.left }));
                console.log('自定义QR插件：保存胡萝卜按钮位置');
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
        const savedPos = JSON.parse(localStorage.getItem('cip_button_position_v4'));
        if (savedPos?.top && savedPos?.left) {
            carrotButton.style.position = 'fixed';
            carrotButton.style.top = savedPos.top;
            carrotButton.style.left = savedPos.left;
            console.log(`自定义QR插件：加载胡萝卜按钮位置 (${savedPos.left}, ${savedPos.top})`);
        }
    }

    function init() {
        console.log('自定义QR插件：开始初始化');
        loadStickerData();
        loadFormats();
        renderCategories();
        renderTabs();
        loadButtonPosition();
        switchStickerCategory(Object.keys(stickerData)[0] || '');
        switchTab('text');
        console.log('自定义QR插件：初始化完成，胡萝卜按钮应可见');
    }

    init();
})();
