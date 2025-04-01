import { actions } from "astro:actions";

type FormType = "signin" | "signup" | "resend" | "clearEmail";

function isElementOrFragment(
  node: Node | null
): node is Element | DocumentFragment {
  return (
    node !== null &&
    (node instanceof Element || node instanceof DocumentFragment)
  );
}

function querySelector<T extends Element>(
  parent: Node | null,
  selector: string
): T | null {
  if (!parent) return null;
  return isElementOrFragment(parent) ? parent.querySelector<T>(selector) : null;
}

function querySelectorAll<T extends Element>(
  parent: Node | null,
  selector: string
): T[] {
  if (!parent || !isElementOrFragment(parent)) return [];
  return Array.from(parent.querySelectorAll<T>(selector));
}

// function enhanceLoginForms() {
//   document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
//     if (form.hasAttribute("data-enhanced")) return;
//     form.setAttribute("data-enhanced", "true");

//     form.addEventListener("submit", async (event) => {
//       event.preventDefault();

//       const formData = new FormData(form);
//       const submitter = event.submitter as HTMLButtonElement;

//       if (submitter && submitter.name === "formType") {
//         formData.set("formType", submitter.value);
//       }

//       const formType = formData.get("formType")?.toString() as
//         | FormType
//         | undefined;
//       const email = formData.get("email")?.toString() || null;

//       if (!formType) {
//         showError("Invalid form submission: missing form type");
//         return;
//       }

//       setFormLoading(true, submitter);

//       try {
//         let result;
//         switch (formType) {
//           case "signin":
//             result = await actions.auth.signin(formData);
//             break;
//           case "signup":
//             result = await actions.auth.signup(formData);
//             break;
//           case "resend":
//             result = await actions.auth.resend(formData);
//             break;
//           case "clearEmail":
//             result = await actions.auth.clearEmail(formData);
//             if (!result.error) {
//               // reload to set cookie
//               window.location.href = window.location.pathname;
//               return;
//             }
//             break;
//           default:
//             throw new Error(`Invalid form type: ${formType}`);
//         }
//         if (result.error) {
//           showError(result.error.message);
//         } else if (result.data) {
//           if (["signin", "signup", "resend"].includes(formType)) {
//             showSuccess(result.data, email, formType);
//           }
//         }
//       } catch (error) {
//         showError(
//           error instanceof Error
//             ? error.message
//             : "An unexpected error occurred"
//         );
//       } finally {
//         setFormLoading(false);
//       }
//     });
//   });
// }
function enhanceLoginForms() {
  console.log("Enhancing login forms...");
  document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
    if (form.hasAttribute("data-enhanced")) {
      console.log("Form already enhanced, skipping:", form);
      return;
    }

    console.log("Enhancing form:", form);
    form.setAttribute("data-enhanced", "true");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      console.log("Form submit event triggered");

      const formData = new FormData(form);
      const submitter = event.submitter as HTMLButtonElement;
      console.log("Form submitter:", submitter);

      if (submitter && submitter.name === "formType") {
        formData.set("formType", submitter.value);
        console.log(`Setting formType to ${submitter.value}`);
      }

      const formType = formData.get("formType")?.toString() as
        | FormType
        | undefined;
      const email = formData.get("email")?.toString() || null;

      console.log("Form submission - Type:", formType, "Email:", email);

      if (!formType) {
        showError("Invalid form submission: missing form type");
        return;
      }

      setFormLoading(true, submitter);

      try {
        let result;
        switch (formType) {
          case "signin":
            result = await actions.auth.signin(formData);
            break;
          case "signup":
            result = await actions.auth.signup(formData);
            break;
          case "resend":
            result = await actions.auth.resend(formData);
            break;
          case "clearEmail":
            result = await actions.auth.clearEmail(formData);
            if (!result.error) {
              // reload to set cookie
              window.location.href = window.location.pathname;
              return;
            }
            break;
          default:
            throw new Error(`Invalid form type: ${formType}`);
        }

        console.log("Form submission result:", result);

        if (result.error) {
          showError(result.error.message);
        } else if (result.data) {
          if (["signin", "signup", "resend"].includes(formType)) {
            showSuccess(result.data, email, formType);
          }
        }
      } catch (error) {
        console.error("Form submission error:", error);
        showError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        );
      } finally {
        setFormLoading(false);
      }
    });
  });

  // 2. Additionally, let's handle any standalone buttons that might need form associations
  document
    .querySelectorAll<HTMLButtonElement>(
      'button[value="signup"]:not([data-enhanced])'
    )
    .forEach((button) => {
      console.log(
        "Found signup button outside of enhanced form, attaching direct handler:",
        button
      );
      button.setAttribute("data-enhanced", "true");

      button.addEventListener("click", (e) => {
        console.log("Signup button clicked directly");
        e.preventDefault();

        // Find the nearest form or create one if needed
        let form = button.closest("form");
        if (!form) {
          console.log("Creating new form for signup button");
          // Create a form if none exists
          form = document.createElement("form");
          form.method = "post";
          // Add the form to the DOM
          button.parentNode?.insertBefore(form, button);
          form.appendChild(button);
          // Enhance the new form
          enhanceLoginForms();
        }

        // If the form is already enhanced, manually trigger submission
        if (form.hasAttribute("data-enhanced")) {
          console.log("Manually triggering form submission");
          // Set up a submit event
          const event = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });
          // Set the submitter property (this is typically done by the browser)
          Object.defineProperty(event, "submitter", {
            value: button,
            enumerable: true,
          });
          form.dispatchEvent(event);
        }
      });
    });
}
function showError(message: string) {
  let errorElement = document.querySelector<HTMLElement>('[role="alert"]');

  if (!errorElement) {
    errorElement = document.createElement("div");
    errorElement.setAttribute("role", "alert");
    errorElement.setAttribute("aria-live", "assertive");

    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.insertBefore(errorElement, mainElement.firstChild);
    }
  }

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add("visible");
  }
}

// function showSuccess(
//   data: { message: string },
//   email: string | null,
//   formType: FormType
// ) {
//   const formSubmittedTemplate = document.getElementById(
//     "form-submitted-template"
//   ) as HTMLTemplateElement | null;
//   if (!formSubmittedTemplate) return;

//   const content = formSubmittedTemplate.content.cloneNode(true);

//   if (!isElementOrFragment(content)) return;

//   const messageEl = querySelector(content, "[data-message]");
//   if (messageEl) {
//     messageEl.textContent = data.message;
//   }

//   const emailEl = querySelector(content, "[data-email]");
//   if (emailEl && email) emailEl.textContent = email;

//   querySelectorAll<HTMLInputElement>(content, "[data-email-input]").forEach(
//     (input) => {
//       input.value = email || "";
//     }
//   );

//   console.log("Form type:", formType);

//   if (formType === "signin") {
//     const container = querySelector(content, "[data-create-account-container]");
//     const createAccountTemplate = document.getElementById(
//       "create-account-template"
//     ) as HTMLTemplateElement | null;

//     if (container && createAccountTemplate) {
//       const accountContent = createAccountTemplate.content.cloneNode(true);

//       if (isElementOrFragment(accountContent)) {
//         const emailInput = querySelector<HTMLInputElement>(
//           accountContent,
//           "[data-email-input]"
//         );
//         if (emailInput && email) emailInput.value = email;
//         container.appendChild(accountContent);
//       }
//     }
//   }

//   const mainElement = document.querySelector("main");
//   const existingForm = mainElement?.querySelector("form");
//   const formContainer = existingForm?.parentElement;

//   if (formContainer && isElementOrFragment(content)) {
//     formContainer.innerHTML = "";
//     formContainer.appendChild(content);

//     enhanceLoginForms();
//     handleResendButtons();
//   }
// }
// function showSuccess(
//   data: { message: string },
//   email: string | null,
//   formType: FormType
// ) {
//   console.log("Showing success for formType:", formType);

//   const formSubmittedTemplate = document.getElementById(
//     "form-submitted-template"
//   ) as HTMLTemplateElement | null;
//   if (!formSubmittedTemplate) {
//     console.error("Form submitted template not found");
//     return;
//   }

//   const content = formSubmittedTemplate.content.cloneNode(true);

//   if (!isElementOrFragment(content)) {
//     console.error("Template content is not an element or fragment");
//     return;
//   }

//   const messageEl = querySelector(content, "[data-message]");
//   if (messageEl) {
//     messageEl.textContent = data.message;
//   }

//   const emailEl = querySelector(content, "[data-email]");
//   if (emailEl && email) emailEl.textContent = email;

//   querySelectorAll<HTMLInputElement>(content, "[data-email-input]").forEach(
//     (input) => {
//       input.value = email || "";
//     }
//   );

//   // Special handling for signin success to add create account option
//   if (formType === "signin") {
//     console.log("Adding create account template for signin success");
//     const container = querySelector(content, "[data-create-account-container]");
//     const createAccountTemplate = document.getElementById(
//       "create-account-template"
//     ) as HTMLTemplateElement | null;

//     if (container && createAccountTemplate) {
//       container.innerHTML = "";

//       const accountContent = createAccountTemplate.content.cloneNode(true);

//       if (isElementOrFragment(accountContent)) {
//         const emailInput = querySelector<HTMLInputElement>(
//           accountContent,
//           "[data-email-input]"
//         );
//         if (emailInput && email) emailInput.value = email;
//         container.appendChild(accountContent);
//       }
//     }
//   }

//   const mainElement = document.querySelector("main");
//   const existingForm = mainElement?.querySelector("form");
//   const formContainer = existingForm?.parentElement;

//   if (formContainer && isElementOrFragment(content)) {
//     console.log("Replacing form container content");
//     formContainer.innerHTML = "";
//     formContainer.appendChild(content);

//     console.log("Re-enhancing forms after DOM changes");
//     enhanceLoginForms();
//     handleResendButtons();
//   }
// }

// Enhanced version of showSuccess function to properly handle the transition
// from signin success to signup form

function showSuccess(
  data: { message: string },
  email: string | null,
  formType: FormType
) {
  console.log("Showing success for formType:", formType);

  // For signin->signup flow, we need special handling
  const isSignupAfterSignin =
    formType === "signup" && document.querySelector("[data-message]") !== null;

  if (isSignupAfterSignin) {
    console.log(
      "Detected signup after signin flow - clearing previous content"
    );
    // Find the main content area
    const mainElement = document.querySelector("main");
    if (mainElement) {
      // Clear out any previous success messages or forms
      // Look for elements likely to be part of the previous signin success display
      const previousContentSelectors = [
        "[data-message]",
        "[data-create-account-container]",
        "[data-email]",
      ];

      previousContentSelectors.forEach((selector) => {
        const elements = mainElement.querySelectorAll(selector);
        elements.forEach((el) => {
          // Remove each element that matches our selectors
          el.parentElement?.removeChild(el);
        });
      });
    }
  }

  // Now proceed with normal template rendering
  const templateId =
    formType === "signup" ? "create-account-template" : "form-submitted-template";
  const template = document.getElementById(
    templateId
  ) as HTMLTemplateElement | null;

  if (!template) {
    console.error(`Template ${templateId} not found`);
    return;
  }

  const content = template.content.cloneNode(true);

  if (!isElementOrFragment(content)) {
    console.error("Template content is not an element or fragment");
    return;
  }

  // Populate template data
  const messageEl = querySelector(content, "[data-message]");
  if (messageEl) {
    messageEl.textContent = data.message;
  }

  const emailEl = querySelector(content, "[data-email]");
  if (emailEl && email) emailEl.textContent = email;

  querySelectorAll<HTMLInputElement>(content, "[data-email-input]").forEach(
    (input) => {
      input.value = email || "";
    }
  );

  // Special handling for signin success to add create account option
  if (formType === "signin") {
    console.log("Adding create account template for signin success");
    const container = querySelector(content, "[data-create-account-container]");
    const createAccountTemplate = document.getElementById(
      "create-account-template"
    ) as HTMLTemplateElement | null;

    if (container && createAccountTemplate) {
      // Clear the container first to prevent duplication
      container.innerHTML = "";

      const accountContent = createAccountTemplate.content.cloneNode(true);

      if (isElementOrFragment(accountContent)) {
        const emailInput = querySelector<HTMLInputElement>(
          accountContent,
          "[data-email-input]"
        );
        if (emailInput && email) emailInput.value = email;
        container.appendChild(accountContent);
      }
    }
  }

  // Find where to put the content
  const mainElement = document.querySelector("main");
  let targetContainer;

  if (isSignupAfterSignin) {
    // For signup after signin, insert at the beginning of main
    targetContainer = mainElement;
    // Insert at the beginning of main
    if (targetContainer && isElementOrFragment(content)) {
      // If we're replacing the entire content
      if (formType === "signup") {
        // For signup, clear the entire main content
        targetContainer.innerHTML = "";
      }
      targetContainer.insertBefore(content, targetContainer.firstChild);
    }
  } else {
    // Standard flow - replace form container content
    const existingForm = mainElement?.querySelector("form");
    const formContainer = existingForm?.parentElement;

    if (formContainer && isElementOrFragment(content)) {
      console.log("Replacing form container content");
      formContainer.innerHTML = "";
      formContainer.appendChild(content);
    }
  }

  // Re-enhance all forms after DOM changes
  console.log("Re-enhancing forms after DOM changes");
  enhanceLoginForms();
  handleResendButtons();

  // For signup specifically, focus the first input field
  if (formType === "signup") {
    setTimeout(() => {
      const firstInput = document.querySelector("form input:first-child");
      if (firstInput instanceof HTMLInputElement) {
        firstInput.focus();
      }
    }, 0);
  }
}

function setFormLoading(isLoading: boolean, clickedButton?: HTMLButtonElement) {
  if (isLoading && clickedButton) {
    clickedButton.disabled = true;
    clickedButton.dataset.originalText = clickedButton.textContent || "";
    clickedButton.textContent = "Loading...";
  } else {
    document
      .querySelectorAll<HTMLButtonElement>("form button")
      .forEach((button) => {
        button.disabled = false;
        if (button.dataset.originalText) {
          button.textContent = button.dataset.originalText;
          delete button.dataset.originalText;
        }
      });
  }
}

function handleResendButtons() {
  const COOLDOWN_SECONDS = 30;
  const BUTTON_SELECTOR = "#resend-btn";
  document
    .querySelectorAll<HTMLButtonElement>(BUTTON_SELECTOR)
    .forEach((button) => {
      startCountdown(button, COOLDOWN_SECONDS);

      button.addEventListener("click", (event) => {
        if (button.disabled) {
          event.preventDefault();
          return;
        }
      });
    });
}

function startCountdown(button: HTMLButtonElement, seconds: number) {
  let remainingSeconds = seconds;
  let rafId: number | null = null;
  let lastTime = performance.now();
  console.log("Starting countdown:", button, seconds);

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const updateInterval = prefersReducedMotion ? 5 : 1;

  function tick(now: number) {
    if (!document.body.contains(button)) {
      if (rafId !== null) cancelAnimationFrame(rafId);
      return;
    }

    button.setAttribute("disabled", "disabled");
    button.textContent = `Resend Link (${remainingSeconds})`;

    const elapsed = (now - lastTime) / 1000;

    if (elapsed >= updateInterval) {
      remainingSeconds = Math.max(0, remainingSeconds - Math.floor(elapsed));
      lastTime = now;

      button.textContent = remainingSeconds
        ? `Resend Link (${remainingSeconds})`
        : "Resend Link";

      if (remainingSeconds <= 0) {
        button.removeAttribute("disabled");
        return;
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
}

enhanceLoginForms();
