import { actions, isInputError } from "astro:actions";

type FormType = "signin" | "signup" | "resend" | "clearEmail";

class LoginComponent extends HTMLElement {
  private originalForm: HTMLFormElement | null = null;
  private static COOLDOWN_SECONDS = 30;
  private static REQUIRED_TEMPLATES = [
    "error-template",
    "button-loading-template",
    "signin-success-template",
    "signup-success-template",
  ];

  constructor() {
    super();
  }

  connectedCallback() {
    if (!this.checkRequiredTemplates()) return;

    this.originalForm = this.querySelector("form");
    if (!this.originalForm) {
      console.error("LoginComponent: No form element found");
      return;
    }

    const clonedForm = this.originalForm.cloneNode(true) as HTMLFormElement;
    this.originalForm.setAttribute("hidden", "");

    clonedForm.setAttribute("data-enhanced", "true");
    clonedForm.addEventListener("submit", this.handleFormSubmit.bind(this));

    this.appendChild(clonedForm);
  }

  private checkRequiredTemplates(): boolean {
    return LoginComponent.REQUIRED_TEMPLATES.every((templateId) => {
      const template = document.getElementById(
        templateId
      ) as HTMLTemplateElement;
      return !!template;
    });
  }

  private async handleFormSubmit(event: SubmitEvent) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const submitter = event.submitter as HTMLButtonElement | null;

    if (submitter && submitter.name === "formType") {
      formData.set("formType", submitter.value);
    }

    const formType = formData.get("formType")?.toString() as
      | FormType
      | undefined;
    const email = formData.get("email")?.toString() || null;

    if (!formType) {
      this.showError("Invalid form submission: missing form type");
      return;
    }

    this.setFormLoading(true, submitter);

    try {
      let result;

      if (formType === "clearEmail") {
        result = await actions.auth.clearEmail(formData);
        const { error } = result;

        if (!error) {
          this.resetForm();
          return;
        }
      } else {
        result = await this.performAction(formType, formData);
      }

      const { error, data } = result;

      if (error) {
        if (isInputError(error)) {
          // this weird check is to get around losing the types of error.fields in LSP pretty regularly
          // TO DO: figure out why this is happening
          if (
            error.fields &&
            "email" in error.fields &&
            error.fields.email &&
            Array.isArray(error.fields.email)
          ) {
            const message = error.fields.email.join(", ");
            this.showError(message);
          } else {
            this.showError("Please check your input and try again");
          }
        } else {
          this.showError(error.message);
        }
      } else if (data) {
        this.showSuccess(data, email, formType);
      }
    } catch (error) {
      this.showError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      this.setFormLoading(false);
    }
  }

  private async performAction(formType: FormType, formData: FormData) {
    switch (formType) {
      case "signin":
        return actions.auth.signin(formData);
      case "signup":
        return actions.auth.signup(formData);
      case "resend":
        return actions.auth.resend(formData);
      default:
        throw new Error("Invalid form type");
    }
  }

  private showError(message: string) {
    const existingError = this.querySelector('[role="alert"]');
    if (existingError) {
      existingError.remove();
    }

    const errorTemplate = document.getElementById(
      "error-template"
    ) as HTMLTemplateElement;
    const clone = document.importNode(errorTemplate.content, true);

    const errorElement = clone.querySelector('[role="alert"]');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add("visible");
      this.insertBefore(clone, this.firstChild);
    }
  }

  private showSuccess(
    data: { message: string },
    email: string | null,
    formType: FormType
  ) {
    this.clearContent();

    const templateId =
      formType === "signin"
        ? "signin-success-template"
        : "signup-success-template";
    const template = document.getElementById(templateId) as HTMLTemplateElement;

    const content = document.importNode(template.content, true);

    const messageElement = content.querySelector('[data-role="message"]');
    if (messageElement) messageElement.textContent = data.message;

    const emailElement = content.querySelector('[data-role="email"]');
    if (emailElement && email) emailElement.textContent = ` (${email})`;

    content.querySelectorAll('input[name="email"]').forEach((input) => {
      if (input instanceof HTMLInputElement && email) {
        input.value = email;
      }
    });

    this.appendChild(content);
    this.hydrateForms();
    this.hydrateResendButtons();
  }

  private clearContent(): void {
    const originalForm = this.querySelector("form[hidden]");

    const children = Array.from(this.children);
    for (const child of children) {
      if (child !== originalForm) {
        child.remove();
      }
    }
  }

  private hydrateForms() {
    this.querySelectorAll<HTMLFormElement>(
      "form:not([hidden]):not([data-enhanced])"
    ).forEach((form) => {
      form.setAttribute("data-enhanced", "true");
      form.addEventListener("submit", this.handleFormSubmit.bind(this));
    });
  }

  private setFormLoading(
    isLoading: boolean,
    clickedButton?: HTMLButtonElement | null
  ) {
    if (isLoading && clickedButton) {
      clickedButton.disabled = true;
      clickedButton.dataset.originalText = clickedButton.textContent || "";

      clickedButton.textContent = "";
      const loadingTemplate = document.getElementById(
        "button-loading-template"
      ) as HTMLTemplateElement;
      const loadingContent = document.importNode(loadingTemplate.content, true);
      clickedButton.appendChild(loadingContent);
    } else {
      this.querySelectorAll<HTMLButtonElement>("form button").forEach(
        (button) => {
          button.disabled = false;
          if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
          }
        }
      );
    }
  }

  private hydrateResendButtons() {
    this.querySelectorAll<HTMLButtonElement>("#resend-btn").forEach(
      (button) => {
        this.startCountdown(button, LoginComponent.COOLDOWN_SECONDS);

        button.addEventListener(
          "click",
          (event) => {
            if (button.disabled) {
              event.preventDefault();
            }
          },
          { passive: true }
        );
      }
    );
  }

  private startCountdown(button: HTMLButtonElement, seconds: number) {
    let remainingSeconds = seconds;
    let rafId: number | null = null;
    let lastTime = performance.now();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const updateInterval = prefersReducedMotion ? 5 : 1;

    const tick = (now: number) => {
      if (!this.isConnected) {
        if (rafId !== null) cancelAnimationFrame(rafId);
        return;
      }

      button.disabled = true;

      const elapsed = (now - lastTime) / 1000;
      if (elapsed >= updateInterval) {
        remainingSeconds = Math.max(0, remainingSeconds - Math.floor(elapsed));
        lastTime = now;

        button.textContent = `Resend Link (${remainingSeconds})`;

        if (remainingSeconds <= 0) {
          button.disabled = false;
          button.textContent = "Resend Link";
          return;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  }

  private resetForm(): void {
    this.clearContent();
    const originalForm = this.querySelector<HTMLFormElement>("form[hidden]");
    if (!originalForm) return;
    const newForm = originalForm.cloneNode(true) as HTMLFormElement;
    newForm.removeAttribute("hidden");
    newForm.setAttribute("data-enhanced", "true");
    newForm.addEventListener("submit", this.handleFormSubmit.bind(this));
    this.appendChild(newForm);
    newForm
      .querySelectorAll<HTMLInputElement>("input:not([type=hidden])")
      .forEach((input) => {
        input.value = "";
      });
  }
}

customElements.define("login-component", LoginComponent);
