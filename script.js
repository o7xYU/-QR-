// script.js (v2.2 - 启动修复版)
(function () {
    if (document.getElementById('cip-carrot-button')) return;

    // --- 0. 全局常量和状态 ---
    const MODULES_KEY = 'cip_modules_config_v2';
    const BTN_POS_KEY = 'cip_button_position_v4';
    const STICKER_DATA_KEY = 'cip_sticker_data_v2';

    let modules = []; let currentTabId = null; let stickerData = {};
    let selectedSticker = null; let currentActiveSubOptionId = 'plain';

    // --- 1. 默认模块配置与数据处理 ---
    function getDefaultModules(){return [{id:"text",name:"文字信息",type:"text",deletable:!1,subOptions:[{id:"plain",name:"纯文本",format:"“{content}”"},{id:"image",name:"图片",format:"“[{content}.jpg]”"},{id:"video",name:"视频",format:"“[{content}.mp4]”"},{id:"music",name:"音乐",format:"“[{content}.mp3]”"},{id:"post",name:"帖子",format:"“[{content}.link]”"}]},{id:"voice",name:"语音",type:"voice",deletable:!1,format:"={duration}'|{message}="},{id:"cheat_mode",name:"作弊模式",type:"simple",deletable:!0,format:"({content})"},{id:"stickers",name:"表情包",type:"stickers",deletable:!1,format:"!{desc}|{url}!"}]}
    function loadModules(){const e=localStorage.getItem(MODULES_KEY);try{const t=JSON.parse(e);if(!Array.isArray(t)||0===t.length)throw new Error("Invalid modules data");modules=t}catch(t){modules=getDefaultModules(),saveModules()}currentTabId=modules[0]?.id}
    function saveModules(){localStorage.setItem(MODULES_KEY,JSON.stringify(modules))}
    function loadStickerData(){const e=localStorage.getItem(STICKER_DATA_KEY);e&&(stickerData=JSON.parse(e))}
    function saveStickerData(){localStorage.setItem(STICKER_DATA_KEY,JSON.stringify(stickerData))}
    function loadButtonPosition(){const e=JSON.parse(localStorage.getItem(BTN_POS_KEY));e?.top&&e?.left&&(getEl("cip-carrot-button").style.position="fixed",getEl("cip-carrot-button").style.top=e.top,getEl("cip-carrot-button").style.left=e.left)}

    // --- 2. UI 创建 & 渲染 ---
    function createUI(){const e=(e,t,o,i)=>{const n=document.createElement(e);return t&&(n.id=t),o&&(n.className=o),i&&(n.innerHTML=i),n},t=e("div","cip-carrot-button",null,"🥕"),o=e("div","cip-input-panel","cip-frosted-glass",'\n            <nav id="cip-panel-tabs"></nav>\n            <div id="cip-format-display"></div>\n            <div id="cip-panel-content"></div>\n            <div id="cip-panel-footer">\n                <div class="cip-footer-group">\n                    <div id="cip-emoji-picker-btn">😊</div>\n                    <div id="cip-manage-btn" title="管理模块">⚙️</div>\n                </div>\n                <div class="cip-footer-actions">\n                    <button id="cip-recall-button">撤回</button>\n                    <button id="cip-insert-button">插 入</button>\n                </div>\n            </div>'),i=e("emoji-picker","cip-emoji-picker","cip-frosted-glass"),n=e("div","cip-manage-modal","cip-modal-backdrop",'<div class="cip-modal-content cip-frosted-glass"><h3>模块管理</h3><div class="cip-modal-body"><ul id="cip-module-list"></ul></div><div class="cip-modal-footer"><button id="cip-add-module-btn" class="cip-modal-button cip-modal-button-primary">添加新模块</button><button id="cip-close-manage-btn" class="cip-modal-button cip-modal-button-secondary">关闭</button></div></div>'),c=e("div","cip-edit-modal","cip-modal-backdrop",'<div class="cip-modal-content cip-frosted-glass"><h3 id="cip-edit-modal-title"></h3><div class="cip-modal-body cip-edit-form"><div class="form-group"><label for="cip-edit-name">名称</label><input type="text" id="cip-edit-name" class="cip-edit-modal-input"></div><div class="form-group"><label for="cip-edit-type">类型</label><select id="cip-edit-type" class="cip-edit-modal-select"><option value="simple">简单文本</option><option value="voice">语音</option></select></div><div class="form-group"><label for="cip-edit-format">格式</label><input type="text" id="cip-edit-format" class="cip-edit-modal-input"><p class="cip-format-help">可用变量: {content}, {duration}, {message}</p></div></div><div class="cip-modal-footer"><button id="cip-cancel-edit-btn" class="cip-modal-button cip-modal-button-secondary">取消</button><button id="cip-save-edit-btn" class="cip-modal-button cip-modal-button-primary">保存</button></div></div>'),d=e("div","cip-add-stickers-modal","cip-modal-backdrop",'<div class="cip-modal-content cip-frosted-glass"><h3 id="cip-add-sticker-title"></h3><p>每行一个，格式为：<br><code>表情包描述:图片链接</code></p><textarea id="cip-new-stickers-input" placeholder="可爱猫猫:https://example.com/cat.png\n狗狗点头:https://example.com/dog.gif"></textarea><div class="cip-modal-actions"><button id="cip-cancel-stickers-btn" class="cip-modal-button cip-modal-button-secondary">取消</button><button id="cip-save-stickers-btn" class="cip-modal-button cip-modal-button-primary">保存</button></div></div>');return document.body.appendChild(t),document.body.appendChild(o),document.body.appendChild(i),document.body.appendChild(n),document.body.appendChild(c),document.body.appendChild(d),{carrotButton:t,inputPanel:o,emojiPicker:i,manageModal:n,editModal:c,addStickersModal:d}}
    function renderApp(){const e=getEl("cip-panel-tabs"),t=getEl("cip-panel-content");e.innerHTML="",t.innerHTML="",modules.forEach(o=>{e.appendChild(createTabButton(o)),t.appendChild(createContentPanel(o))}),switchTab(currentTabId)}
    function createTabButton(e){const t=document.createElement("button");return t.className="cip-tab-button",t.textContent=e.name,t.dataset.tabId=e.id,t}
    function createContentPanel(e){const t=document.createElement("div");switch(t.id=`cip-${e.id}-content`,t.className="cip-content-section",e.type){case"text":const o=e.subOptions.map((e,t)=>`<button class="cip-sub-option-btn ${0===t?"active":""}" data-sub-id="${e.id}">${e.name}</button>`).join("");t.innerHTML=`<div class="cip-sub-options-container">${o}</div><textarea id="cip-main-input" class="cip-textarea"></textarea>`;break;case"voice":t.innerHTML='<input type="number" id="cip-voice-duration" placeholder="输入时长 (秒, 仅数字)"><textarea id="cip-voice-message" class="cip-textarea"></textarea>';break;case"simple":case"bunny":t.innerHTML=`<textarea id="cip-${e.id}-input" class="cip-textarea"></textarea>`;break;case"stickers":t.innerHTML='<div id="cip-sticker-categories" class="cip-sub-options-container"><button id="cip-add-category-btn" class="cip-sub-option-btn">+</button></div><div id="cip-sticker-grid"></div>'}return t}

    // --- 3. 核心逻辑与事件监听 ---
    function switchTab(e){modules.find(t=>t.id===e)||(e=modules[0]?.id),currentTabId=e;const t=modules.find(t=>t.id===e);t&&(queryAllEl(".cip-tab-button").forEach(t=>t.classList.toggle("active",t.dataset.tabId===e)),queryAllEl(".cip-content-section").forEach(t=>t.classList.toggle("active",t.id===`cip-${e}-content`)),"stickers"===e&&renderStickerCategories(),"text"===t.type&&(currentActiveSubOptionId=t.subOptions[0].id),updateFormatDisplay())}
    function updateFormatDisplay(){const e=modules.find(e=>e.id===currentTabId);if(!e)return;let t="";switch(e.type){case"text":const o=e.subOptions.find(e=>e.id===currentActiveSubOptionId);t=o?o.format.replace("{content}","内容"):"";break;case"voice":t=e.format.replace("{duration}","数字").replace("{message}","内容");break;case"simple":case"bunny":t=e.format.replace("{content}","内容");break;case"stickers":t=e.format.replace("{desc}","描述").replace("{url}","链接");const i=getEl("cip-input-panel")?.querySelector(`.cip-sticker-category-btn[data-category="${currentStickerCategory}"]`);if(i){queryAllEl(".cip-category-action-icon").forEach(e=>e.remove());const t=document.createElement("i");t.textContent=" ➕",t.className="cip-category-action-icon",t.title="添加表情包",t.onclick=e=>{e.stopPropagation(),openAddStickersModal(currentStickerCategory)},i.appendChild(t);const o=document.createElement("i");o.textContent=" 🗑️",o.className="cip-category-action-icon cip-delete-category-btn",o.title="删除分类",o.onclick=e=>{e.stopPropagation(),confirm(`确定删除「${currentStickerCategory}」分类?`)&&(delete stickerData[currentStickerCategory],saveStickerData(),renderStickerCategories(),switchStickerCategory(Object.keys(stickerData)[0]||""))},i.appendChild(o)}}}getEl("cip-format-display").textContent=`格式: ${t}`}
    function insertIntoSillyTavern(e){const t=document.querySelector("#send_textarea");t?(t.value+=(t.value.trim()?"\n":"")+e,t.dispatchEvent(new Event("input",{bubbles:!0})),t.focus()):alert("未能找到SillyTavern的输入框！")}
    
    // Sticker and Modal logic
    let currentStickerCategory="";function renderStickerCategories(){const e=getEl("cip-sticker-categories");if(!e)return;e.innerHTML='<button id="cip-add-category-btn" class="cip-sub-option-btn">+</button>',Object.keys(stickerData).forEach(t=>{const o=document.createElement("button");o.textContent=t,o.className="cip-sub-option-btn cip-sticker-category-btn",o.dataset.category=t,e.appendChild(o)}),switchStickerCategory(currentStickerCategory||Object.keys(stickerData)[0])}
    function switchStickerCategory(e){currentStickerCategory=e||"";const t=getEl("cip-sticker-categories");t&&t.querySelectorAll(".cip-sticker-category-btn").forEach(t=>t.classList.toggle("active",t.dataset.category===e)),renderStickers(e),selectedSticker=null,updateFormatDisplay()}
    function renderStickers(e){const t=getEl("cip-sticker-grid");if(!t)return;if(t.innerHTML="",!e||!stickerData[e])return void(t.innerHTML='<div class="cip-sticker-placeholder">请先选择或添加一个分类...</div>');const o=stickerData[e];if(0===o.length)return void(t.innerHTML='<div class="cip-sticker-placeholder">这个分类还没有表情包...</div>');o.forEach((e,o)=>{const i=document.createElement("div");i.className="cip-sticker-wrapper";const n=document.createElement("img");n.src=e.url,n.title=e.desc,n.className="cip-sticker-item",n.onclick=()=>{t.querySelector(".selected")?.classList.remove("selected"),n.classList.add("selected"),selectedSticker=e};const c=document.createElement("button");c.innerHTML="&times;",c.className="cip-delete-sticker-btn",c.title="删除这个表情包",c.onclick=t=>{t.stopPropagation(),confirm(`确定删除表情「${e.desc}」?`)&&(stickerData[currentStickerCategory].splice(o,1),saveStickerData(),renderStickers(currentStickerCategory))},i.appendChild(c),t.appendChild(n),t.appendChild(i)})}
    function openAddStickerCategoryModal(){const e=prompt("请输入新的表情包分类名称：");e&&!stickerData[e]&&(stickerData[e]=[],saveStickerData(),renderStickerCategories(),switchStickerCategory(e))}
    function openAddStickersModal(e){getEl("cip-add-sticker-title").textContent=`为「${e}」分类添加表情包`,getEl("cip-new-stickers-input").value="",getEl("cip-add-stickers-modal").dataset.currentCategory=e,getEl("cip-add-stickers-modal").classList.add("visible")}

    // --- 4. 事件委托与处理器 ---
    function setupEventListeners() {
        const get = getEl; // Local alias
        const inputPanel = get('cip-input-panel');

        inputPanel.addEventListener('click', e => {
            const target = e.target;
            if (target.matches('.cip-tab-button')) { switchTab(target.dataset.tabId); }
            if (target.matches('.cip-sub-option-btn') && target.closest('#cip-text-content')) {
                target.parentElement.querySelector('.active')?.classList.remove('active');
                target.classList.add('active');
                currentActiveSubOptionId = target.dataset.subId;
                updateFormatDisplay();
            }
            if (target.matches('#cip-add-category-btn')) { openAddStickerCategoryModal(); }
            if (target.matches('.cip-sticker-category-btn')) { switchStickerCategory(target.dataset.category); }
            if (target.matches('.cip-sticker-item')) {
                get('cip-sticker-grid').querySelector('.selected')?.classList.remove('selected');
                target.classList.add('selected');
                const desc = target.title;
                const category = get('cip-sticker-categories').querySelector('.active')?.dataset.category;
                if (category) selectedSticker = stickerData[category]?.find(s => s.desc === desc);
            }
            if (target.matches('.cip-delete-sticker-btn')) {
                const img = target.closest('.cip-sticker-wrapper').querySelector('img');
                if(!img) return;
                const desc = img.title;
                const category = get('cip-sticker-categories').querySelector('.active')?.dataset.category;
                if(confirm(`确定删除表情「${desc}」?`)) {
                    const index = stickerData[category]?.findIndex(s => s.desc === desc);
                    if (index > -1) { stickerData[category].splice(index, 1); saveStickerData(); renderStickers(category); }
                }
            }
        });
        
        get('cip-recall-button').addEventListener('click', () => insertIntoSillyTavern('--'));
        get('cip-manage-btn').addEventListener('click', () => get('cip-manage-modal').classList.add('visible'));
        
        get('cip-insert-button').addEventListener('click', () => {
            const module = modules.find(m => m.id === currentTabId); if (!module) return;
            let formattedText = '', inputToClear = null, durationInput = null;
            switch(module.type) {
                case 'text':
                    const subOpt = module.subOptions.find(so => so.id === currentActiveSubOptionId);
                    const mainInput = get('cip-main-input');
                    if (mainInput.value.trim() && subOpt) { formattedText = subOpt.format.replace('{content}', mainInput.value); inputToClear = mainInput; } break;
                case 'voice':
                    durationInput = get('cip-voice-duration'); const messageInput = get('cip-voice-message');
                    if (durationInput.value.trim() && messageInput.value.trim()) { formattedText = module.format.replace('{duration}', durationInput.value).replace('{message}', messageInput.value); inputToClear = messageInput; } break;
                case 'simple': case 'bunny':
                    const simpleInput = get(`cip-${module.id}-input`);
                    if (simpleInput.value.trim()) { formattedText = module.format.replace('{content}', simpleInput.value); inputToClear = simpleInput; } break;
                case 'stickers': if (selectedSticker) { formattedText = module.format.replace('{desc}', selectedSticker.desc).replace('{url}', selectedSticker.url); } break;
            }
            if (formattedText) { insertIntoSillyTavern(formattedText); if(inputToClear) inputToClear.value = ''; if(durationInput) durationInput.value = ''; }
        });

        // Modals
        get('cip-manage-modal').addEventListener('click', e => {
            const target = e.target.closest('button'); if(!target) return;
            const id = target.dataset.id;
            if (target.matches('.cip-edit-btn')) openEditModal(id);
            if (target.matches('.cip-delete-btn')) {
                if (confirm('你确定要删除这个模块吗?')) {
                    modules = modules.filter(m => m.id !== id);
                    if (currentTabId === id) currentTabId = modules[0]?.id;
                    saveModules(); renderApp(); openManageModal();
                }
            }
            if (target.matches('#cip-add-module-btn')) openEditModal();
            if (target.matches('#cip-close-manage-btn')) get('cip-manage-modal').classList.remove('visible');
        });
        get('cip-edit-modal').addEventListener('click', e => {
            if (e.target.matches('#cip-cancel-edit-btn')) get('cip-edit-modal').classList.remove('visible');
            if (e.target.matches('#cip-save-edit-btn')) {
                const id = e.currentTarget.querySelector('#cip-save-edit-btn').dataset.editingId, name = get('cip-edit-name').value.trim(), type = get('cip-edit-type').value, format = get('cip-edit-format').value.trim();
                if (!name || !format) return alert('名称和格式不能为空！');
                if (id) { const module = modules.find(m => m.id === id); if (module) { module.name = name; if (module.format !== undefined) module.format = format; } }
                else { modules.push({ id: `custom_${Date.now()}`, name, type, format, deletable: true }); }
                saveModules(); renderApp(); get('cip-edit-modal').classList.remove('visible');
            }
        });
        get('cip-add-stickers-modal').addEventListener('click', e => {
            if (e.target.matches('#cip-cancel-stickers-btn')) get('cip-add-stickers-modal').classList.remove('visible');
            if (e.target.matches('#cip-save-stickers-btn')) {
                const category = get('cip-add-stickers-modal').dataset.currentCategory;
                const text = get('cip-new-stickers-input').value.trim();
                if (!category || !text || !stickerData[category]) return; let addedCount = 0;
                text.split('\n').forEach(line => {
                    const parts = line.split(':');
                    if (parts.length >= 2) { const desc = parts[0].trim(), url = parts.slice(1).join(':').trim(); if (desc && url) { stickerData[category].push({ desc, url }); addedCount++; } }
                });
                if (addedCount > 0) { saveStickerData(); if (currentStickerCategory === category) renderStickers(category); get('cip-add-stickers-modal').classList.remove('visible'); }
                else { alert('未能解析任何有效的表情包信息。'); }
            }
        });
        
        // Drag, Click, Emoji Handlers
        function openManageModal(){const t=getEl("cip-module-list");t.innerHTML="",modules.forEach(e=>{const o=document.createElement("li");o.className="cip-module-item",o.innerHTML=`<span class="cip-module-item-name">${e.name}</span><div class="cip-module-item-actions"><button class="cip-edit-btn" data-id="${e.id}" title="编辑">✏️</button>${e.deletable?`<button class="cip-delete-btn" data-id="${e.id}" title="删除">🗑️</button>`:""}</div>`,t.appendChild(o)})}
        function openEditModal(t=null){const e=modules.find(e=>e.id===t),o=getEl("cip-edit-modal-title"),i=getEl("cip-edit-name"),d=getEl("cip-edit-type"),l=getEl("cip-edit-format"),n=getEl("cip-save-edit-btn");e?(o.textContent=`编辑模块: ${e.name}`,i.value=e.name,d.value=e.type,d.disabled=!0,l.value=e.format||"",n.dataset.editingId=t):(o.textContent="添加新模块",i.value="",d.value="simple",d.disabled=!1,l.value="({content})",delete n.dataset.editingId),getEl("cip-manage-modal").classList.remove("visible"),getEl("cip-edit-modal").classList.add("visible")}
        const emojiPicker = get('cip-emoji-picker');
        get('cip-emoji-picker-btn').addEventListener('click',e=>{e.stopPropagation();const t=emojiPicker.style.display==="block";if(t)emojiPicker.style.display="none";else{const t=e.currentTarget.getBoundingClientRect();let o=t.top-350-10;o<10&&(o=t.bottom+10),emojiPicker.style.top=`${o}px`,emojiPicker.style.left=`${t.left}px`,emojiPicker.style.display="block"}});
        emojiPicker.addEventListener('emoji-click', event => { const emoji = event.detail.unicode; const module = modules.find(m => m.id === currentTabId); if (!module) return; let target; switch(module.type) { case 'text': target = getEl('cip-main-input'); break; case 'voice': target = getEl('cip-voice-message'); break; case 'simple': case 'bunny': target = getEl(`cip-${module.id}-input`); break; } if (target) { const { selectionStart, selectionEnd, value } = target; target.value = value.substring(0, selectionStart) + emoji + value.substring(selectionEnd); target.focus(); target.selectionEnd = selectionStart + emoji.length; } emojiPicker.style.display = 'none'; });
        
        const carrotButton = get('cip-carrot-button');
        const mainPanel = get('cip-input-panel');
        function hidePanel() { mainPanel.classList.remove('active'); }
        function showPanel() { const btnRect = carrotButton.getBoundingClientRect(); const panelHeight = mainPanel.offsetHeight || 380; let top = btnRect.top - panelHeight - 10; if (top < 10) { top = btnRect.bottom + 10; } let left = btnRect.left + (btnRect.width / 2) - (mainPanel.offsetWidth / 2); left = Math.max(10, Math.min(left, window.innerWidth - mainPanel.offsetWidth - 10)); mainPanel.style.top = `${top}px`; mainPanel.style.left = `${left}px`; mainPanel.classList.add('active'); }
        
        function dragHandler(e){let t=!0;"touchstart"===e.type&&e.preventDefault();const o=carrotButton.getBoundingClientRect(),i="mouse"===e.type.substring(0,5)?e.clientX:e.touches[0].clientX,d="mouse"===e.type.substring(0,5)?e.clientY:e.touches[0].clientY,l=i-o.left,n=d-o.top;const c=e=>{t=!1,carrotButton.classList.add("is-dragging");let o="mouse"===e.type.substring(0,5)?e.clientX:e.touches[0].clientX,i="mouse"===e.type.substring(0,5)?e.clientY:e.touches[0].clientY,d=o-l,s=i-n;d=Math.max(0,Math.min(d,window.innerWidth-carrotButton.offsetWidth)),s=Math.max(0,Math.min(s,window.innerHeight-carrotButton.offsetHeight)),carrotButton.style.position="fixed",carrotButton.style.left=`${d}px`,carrotButton.style.top=`${s}px`},s=()=>{document.removeEventListener("mousemove",c),document.removeEventListener("mouseup",s),document.removeEventListener("touchmove",c),document.removeEventListener("touchend",s),carrotButton.classList.remove("is-dragging"),t?mainPanel.classList.contains("active")?hidePanel():showPanel():localStorage.setItem(BTN_POS_KEY,JSON.stringify({top:carrotButton.style.top,left:carrotButton.style.left}))};document.addEventListener("mousemove",c),document.addEventListener("mouseup",s),document.addEventListener("touchmove",c,{passive:!1}),document.addEventListener("touchend",s)}
        carrotButton.addEventListener('mousedown', dragHandler);
        carrotButton.addEventListener('touchstart', dragHandler, { passive: false });
        
        document.addEventListener('click', e => {
            if (mainPanel.classList.contains('active') && !mainPanel.contains(e.target) && !carrotButton.contains(e.target)) hidePanel();
            if (emojiPicker.style.display === 'block' && !emojiPicker.contains(e.target) && !getEl('cip-emoji-picker-btn').contains(e.target)) { emojiPicker.style.display = 'none'; }
            if (getEl('cip-manage-modal').classList.contains('visible') && !getEl('cip-manage-modal').querySelector('.cip-modal-content').contains(e.target)) getEl('cip-manage-modal').classList.remove('visible');
            if (getEl('cip-edit-modal').classList.contains('visible') && !getEl('cip-edit-modal').querySelector('.cip-modal-content').contains(e.target)) getEl('cip-edit-modal').classList.remove('visible');
            if (getEl('cip-add-stickers-modal').classList.contains('visible') && !getEl('cip-add-stickers-modal').querySelector('.cip-modal-content').contains(e.target)) getEl('cip-add-stickers-modal').classList.remove('visible');
        });
    }

    // --- 5. 初始化 ---
    function init() {
        const pickerScript = document.createElement('script');
        pickerScript.type = 'module';
        pickerScript.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
        document.head.appendChild(pickerScript);
        
        loadModules();
        createUI();
        loadStickerData();
        loadButtonPosition();
        renderApp();
        setupEventListeners(); // 绑定所有事件
    }

    const getEl = (id) => document.getElementById(id);
    const queryAllEl = (sel) => document.querySelectorAll(sel);
    
    // 使用轮询来确保SillyTavern的UI已准备就绪
    const int = setInterval(() => {
        const anchor = document.querySelector('#chat-buttons-container, #send_form');
        if (anchor) {
            clearInterval(int);
            init();
        }
    }, 100);

})();
