const attachButton = document.querySelector(".attach-button");
const imageInput = document.querySelector("#image-input");
const imagePreview = document.querySelector("#image-preview");
const imagePreviewImg = document.querySelector("#image-preview-img");
const removeImageButton = document.querySelector("#remove-image");
const messageInput = document.querySelector("#message-input");

let selectedImage = null;
let selectedFileName = "";

/*
   KAI image attachment tray
   - Keeps the preview above the composer
   - Uses a compact ChatGPT-style thumbnail
   - Replaces the previous image when another is selected
   - Clears automatically after a message is submitted
*/

const attachmentStyle = document.createElement("style");
attachmentStyle.textContent = `
    /* Attachment tray sits outside the composer, directly above it. */
    .composer-container > #image-preview {
        width: 100%;
        max-width: 900px;
        margin: 0 auto 8px;
        padding: 0;
        border: 0;
        background: transparent;
        box-sizing: border-box;
    }

    .composer-container > #image-preview.image-selected {
        display: flex !important;
        align-items: center;
        gap: 10px;
        width: fit-content;
        max-width: min(100%, 900px);
        min-height: 58px;
        padding: 7px 9px 7px 7px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 14px;
        background: rgba(17, 24, 39, 0.94);
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        animation: kaiAttachmentIn 0.18s ease-out;
    }

    .composer-container > #image-preview #image-preview-img {
        display: block !important;
        width: 46px !important;
        height: 46px !important;
        min-width: 46px;
        min-height: 46px;
        object-fit: cover;
        border-radius: 9px;
        background: var(--surface, #111827);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    #image-file-name {
        min-width: 0;
        max-width: 230px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text, #f8fafc);
        font-size: 12px;
        line-height: 1.35;
    }

    #image-file-name::after {
        content: "";
        display: block;
        color: var(--dim, #778196);
        font-size: 10px;
    }

    .composer-container > #image-preview #remove-image {
        width: 25px;
        height: 25px;
        flex: 0 0 25px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 2px;
        padding: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        color: var(--muted, #a7b0c0);
        font-size: 18px;
        line-height: 1;
        transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    }

    .composer-container > #image-preview #remove-image:hover {
        background: rgba(255, 255, 255, 0.15);
        color: var(--text, #f8fafc);
        transform: scale(1.05);
    }

    @keyframes kaiAttachmentIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 800px) {
        .composer-container > #image-preview {
            max-width: none;
            margin: 0 0 7px;
            padding: 0 3px;
        }

        .composer-container > #image-preview.image-selected {
            max-width: calc(100% - 6px);
            min-height: 52px;
            padding: 6px 8px 6px 6px;
            border-radius: 13px;
        }

        .composer-container > #image-preview #image-preview-img {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px;
            min-height: 40px;
            border-radius: 8px;
        }

        #image-file-name {
            max-width: calc(100vw - 120px);
            font-size: 11px;
        }
    }
`;
document.head.appendChild(attachmentStyle);

/* Move the tray outside the rounded composer so it truly sits above it. */
if (imagePreview && messageInput) {
    const composer = messageInput.closest(".composer");
    const composerContainer = composer?.closest(".composer-container");

    if (composerContainer && imagePreview.parentElement !== composerContainer) {
        composerContainer.insertBefore(imagePreview, composer);
    }
}

/* Add the filename element without changing nova.html. */
let imageFileName = document.querySelector("#image-file-name");
if (imagePreview && !imageFileName) {
    imageFileName = document.createElement("span");
    imageFileName.id = "image-file-name";
    imagePreview.appendChild(imageFileName);
}

function clearSelectedImage() {
    selectedImage = null;
    selectedFileName = "";

    if (imageInput) imageInput.value = "";
    if (imagePreviewImg) imagePreviewImg.removeAttribute("src");
    if (imageFileName) {
        imageFileName.textContent = "";
        imageFileName.removeAttribute("title");
    }

    if (imagePreview) {
        imagePreview.classList.remove("image-selected");
        imagePreview.hidden = true;
    }
}

if (attachButton && imageInput) {
    attachButton.type = "button";

    attachButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        imageInput.click();
    });
}

if (imageInput) {
    imageInput.addEventListener("change", () => {
        const file = imageInput.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            clearSelectedImage();
            alert("Please select an image file.");
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            clearSelectedImage();
            alert("Please choose an image smaller than 15 MB.");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            selectedImage = reader.result;
            selectedFileName = file.name;

            if (imagePreviewImg) {
                imagePreviewImg.src = selectedImage;
                imagePreviewImg.alt = file.name;
            }

            if (imageFileName) {
                imageFileName.textContent = file.name;
                imageFileName.title = file.name;
            }

            if (imagePreview) {
                imagePreview.classList.add("image-selected");
                imagePreview.hidden = false;
            }
        };

        reader.readAsDataURL(file);
    });
}

if (removeImageButton) {
    removeImageButton.addEventListener("click", event => {
        event.preventDefault();
        clearSelectedImage();
        messageInput?.focus();
    });
}

/* The existing app.js handles sending. Clear the pending visual attachment afterwards. */
if (messageInput?.form) {
    messageInput.form.addEventListener("submit", () => {
        setTimeout(clearSelectedImage, 0);
    });
}

window.getKAISelectedImage = () => selectedImage;
window.getKAISelectedImageName = () => selectedFileName;
window.clearKAISelectedImage = clearSelectedImage;
