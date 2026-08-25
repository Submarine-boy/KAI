const attachButton = document.querySelector(".attach-button");
const imageInput = document.querySelector("#image-input");
const imagePreview = document.querySelector("#image-preview");
const imagePreviewImg = document.querySelector("#image-preview-img");
const removeImageButton = document.querySelector("#remove-image");

let selectedImage = null;

function clearSelectedImage() {
    selectedImage = null;
    if (imageInput) imageInput.value = "";
    if (imagePreviewImg) imagePreviewImg.removeAttribute("src");
    if (imagePreview) imagePreview.hidden = true;
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
            if (imagePreviewImg) imagePreviewImg.src = selectedImage;
            if (imagePreview) imagePreview.hidden = false;
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

// Expose the selected image for app.js to include in its Edge Function request.
window.getKAISelectedImage = () => selectedImage;
window.clearKAISelectedImage = clearSelectedImage;
