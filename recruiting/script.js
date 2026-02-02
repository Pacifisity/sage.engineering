const setupContactForm = () => {
	const form = document.querySelector("#contact-form");
	const messageDiv = document.querySelector("#form-message");

	if (!form) {
		return;
	}

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const endpoint = form.getAttribute("data-endpoint");
		const formData = new FormData(form);

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				messageDiv.textContent = "✓ Message sent! I'll get back to you soon.";
				messageDiv.className = "form-message success";
				form.reset();
				setTimeout(() => {
					messageDiv.textContent = "";
					messageDiv.className = "";
				}, 4000);
			} else {
				throw new Error("Failed to send");
			}
		} catch (error) {
			messageDiv.textContent = "✗ Error sending message. Please try again.";
			messageDiv.className = "form-message error";
		}
	});
};

const setupAskQuestionGlow = () => {
	const buttons = document.querySelectorAll(".js-ask-question");
	const target = document.querySelector(".contact-card");

	if (!buttons.length || !target) {
		return;
	}

	buttons.forEach((button) => {
		button.addEventListener("click", () => {
			target.classList.remove("glow");
			window.setTimeout(() => target.classList.add("glow"), 0);
			window.setTimeout(() => target.classList.remove("glow"), 1200);
		});
	});
};

const loadHtml = async () => {
	const targets = document.querySelectorAll("[data-include]");

	await Promise.all(
		Array.from(targets).map(async (target) => {
			const path = target.getAttribute("data-include");
			if (!path) {
				return;
			}

			try {
				const response = await fetch(path, { cache: "no-cache" });
				if (!response.ok) {
					throw new Error(`Failed to load ${path}`);
				}
				target.innerHTML = await response.text();
			} catch (error) {
				target.innerHTML = "";
				console.error(error);
			}
		})
	);

	setupAskQuestionGlow();
	setupContactForm();
};

document.addEventListener("DOMContentLoaded", loadHtml);
