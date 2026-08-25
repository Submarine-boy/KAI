const attachButton = document.querySelector(".attach-button");
const imageInput = document.querySelector("#image-input");
const imagePreview = document.querySelector("#image-preview");
const imagePreviewImg = document.querySelector("#image-preview-img");
const removeImageButton = document.querySelector("#remove-image");

let selectedImage = null;

const attachmentStyle = document.createElement("style");
attachmentStyle.textContent = `
    #image-preview.image-selected {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
    }

    #image-preview.image-selected::before {
        content: "🖼";
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: rgba(37, 99, 235, 0.16);
        font-size: 16px;
    }

    #image-preview.image-selected #image-preview-img {
        display: none !important;
    }
`;
document.head.appendChild(attachmentStyle);

function clearSelectedImage() {
    selectedImage = null;

    if (imageInput) imageInput.value = "";
    if (imagePreviewImg) imagePreviewImg.removeAttribute("src");

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

            // Keep the image data for KAI, but show only an attachment icon in the UI.
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
