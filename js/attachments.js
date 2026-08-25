import { supabase } from "./supabase.js";

const attachButton = document.querySelector(".attach-button");
const imageInput = document.querySelector("#image-input");
const imagePreview = document.querySelector("#image-preview");
const imagePreviewImg = document.querySelector("#image-preview-img");
const removeImageButton = document.querySelector("#remove-image");

let selectedImage = null;

const style = document.createElement("style");
style.textContent = `
.image-preview {
    position: absolute;
    left: 12px;
    bottom: calc(100% + 8px);
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    border-radius: 12px;
    background: #111827;
    border: 1px solid rgba(37, 99, 235, 0.35);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    z-index: 50;
}
.image-preview[hidden] { display: none !important; }
.image-preview img {
    display: block;
    width: 72px;
    height: 72px;
    object-fit: cover;
    border-radius: 8px;
}
.image-preview button {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    color: white;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
}
.composer { position: relative; }
`;
document.head.appendChild(style);

function clearSelectedImage() {
    selectedImage = null;

    if (imageInput) {
        imageInput.value = "";
    }

    if (imagePreviewImg) {
        imagePreviewImg.removeAttribute("src");
    }

    if (imagePreview) {
        imagePreview.hidden = true;
    }
}

if (attachButton && imageInput) {
    attachButton.addEventListener("click", () => imageInput.click());
}

if (imageInput) {
    imageInput.addEventListener("change", () => {
        const file = imageInput.files?.[0];

        if (!file) {
            return;
        }

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
            }

            if (imagePreview) {
                imagePreview.hidden = false;
            }
        };

        reader.readAsDataURL(file);
    });
}

if (removeImageButton) {
    removeImageButton.addEventListener("click", clearSelectedImage);
}

const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

supabase.functions.invoke = async (functionName, options = {}) => {
    if (functionName !== "swift-task") {
        return originalInvoke(functionName, options);
    }

    const body = options.body || {};

    if (!selectedImage) {
        return originalInvoke(functionName, options);
    }

    const lastUserMessage = [...(body.messages || [])]
        .reverse()
        .find(message => message.role === "user");

    const message =
        lastUserMessage?.content ||
        "Please analyze this image.";

    const result = await originalInvoke(functionName, {
        ...options,
        body: {
            message: message || "Please analyze this image.",
            image: selectedImage
        }
    });

    if (!result.error) {
        clearSelectedImage();
    }

    return result;
};
