# Sayso

Use simple language into well-established, executable automation workflows.

---

## What does Sayso do?

Sayso is an multi agenticic AI-powered workflow engine. All you have to do is give it a prompt, and it will build a tructured workflow based on your prompt. It then turns it into a clear graph, and runs ut through a connector system.

It uses models such as OpenRouter to create an executable workflow. There is also a PyTorch model built that is a safety net for when any model fails to execute.

The backend is a REST API that returns the full workflow as JSON, so the frontend can render workflows without any extra backend work. The API is used for multiple purposes such as Execution history, versions, and status updates.


---

## How to use Sayso

1. Open `sayso-one.vercel.app` in your local browser to get started.
2. Then, Log in by clicking the login/signup button on the top right of the landing page navbar.
3. If you do not have an account, make sure to click the "Sign up" link which is under the login page.
4. After you log in/sign up, you will be directed to your dashboard containing your workflows, settings, integrations, and more.
5. Before anything, click the Integrations tab to connect your google services to Sayso.
6. After you select an account in while conecting google services, you will be directed to a google page in whcih you have to click "Advanced" and then "Go to `sayso-one.vercel.app`".
7. Then, go to your workflows tab and create a workflow that tells the agentic model on what to do. For example, if you tell it to respond "Please message me at <phone number>" whenever you recieve an email from someone(you can tell the Sayso AI specific emails to look out for).
8. Just say so and everything will be done for you.