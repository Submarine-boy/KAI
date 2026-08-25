const attachButton = document.querySelector(".attach-button");
const imageInput = document.querySelector("#image-input");
const imagePreview = document.querySelector("#image-preview");
const imagePreviewImg = document.querySelector("#image-preview-img");
const removeImageButton = document.querySelector("#remove-image");
const messageInput = document.querySelector("#message-input");

let selectedImage = null;

let imageFileName = document.querySelector("#image-file-name");
if (imagePreview && !imageFileName) {
    imageFileName = document.createElement("span");
    imageFileName.id = "image-file-name";
    imagePreview.appendChild(imageFileName);
}

const attachmentStyle = document.createElement("style");
attachmentStyle.textContent = `
    #image-preview.image-selected {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        max-width: calc(100% - 20px);
        padding: 8px 10px;
        margin: 0 0 8px 0;
        border: 1px solid rgba(37, 99, 235, 0.25);
        border-radius: 12px;
        background: rgba(17, 24, 39, 0.95);
    }

    #image-preview.image-selected #image-preview-img {
        display: block !important;
        width: 42px !important;
        height: 42px !important;
        flex-shrink: 0;
        object-fit: cover;
        border-radius: 8px;
    }

    #image-file-name {
        min-width: 0;
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: var(--text, #fff);
        font-size: 12px;
    }

    #remove-image {
        flex-shrink: 0;
    }
`;
document.head.appendChild(attachmentStyle);

// Keep the selected-image preview directly above the message placeholder.
if (imagePreview && messageInput) {
    const composer = messageInput.closest(".composer");
    if (composer && imagePreview.parentElement !== composer) {
        composer.insertBefore(imagePreview, messageInput);
    }
}

function clearSelectedImage() {
    selectedImage = null;

    if (imageInput) imageInput.value = "";
    if (imagePreviewImg) imagePreviewImg.removeAttribute("src");
    if (imageFileName) imageFileName.textContent = "";

    if (imagePreview) {
        imagePreview.classList.remove("image-selected");
        imagePreview.hidden = true;
    }
}

if (attachButton && imageInput) {
    attachButton.type = "button";

    attachButton.addEventListener("click", (event) => {
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
    removeImageButton.addEventListener("click", (event) => {
        event.preventDefault();
        clearSelectedImage();
    });
}

window.getKAISelectedImage = () => selectedImage;
window.clearKAISelectedImage = clearSelectedImage;
