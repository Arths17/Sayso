from __future__ import annotations

import asyncio

from app import service
from app.engine import executor
from app.schemas import Node, NodeType, Trigger, WorkflowSpec
from app.storage import repository

EXAMPLES = [
    "When an invoice email arrives, extract the vendor, amount and due date. "
    "If the amount is greater than 5000, require human approval. Record the "
    "invoice to the finance sheet and email finance@company.com.",
    "For each row in the customers sheet, email team@company.com with the row.",
    "Email me whenever a new signup happens.",
]


async def main():
    print("=== Seeding Sayso example workflows ===\n")
    for prompt in EXAMPLES:
        resp = service.generate(prompt, owner_uid="dev-user")
        print(f"[{resp.status}] {resp.workflow_id}")
        print(f"   prompt: {prompt[:70]}...")
        if resp.status == "needs_clarification":
            print(f"   critic asks: {resp.clarification.questions}")
        elif resp.spec:
            print(f"   nodes: {[n.id for n in resp.spec.nodes]}")
            if resp.status == "validated":
                rec = repository.get_workflow(resp.workflow_id)
                ex = repository.new_execution(resp.workflow_id, rec.current_version_id, dry_run=True)
                ex = await executor.run_execution(rec.spec, ex)
                print(f"   dry-run: {ex.state}")
        print()

    broken = WorkflowSpec(
        name="Broken Gmail notify (self-heal demo)",
        trigger=Trigger(type="manual"),
        nodes=[Node(id="notify", type=NodeType.connector, connector="GmailSend", config={})],
    )
    rec = repository.create_workflow("broken gmail demo", broken, owner_uid="dev-user")
    print(f"[self-heal demo] {rec.id}")
    print("   real-run this workflow to trigger the healer:")
    print(f"   POST /workflows/{rec.id}/run")


if __name__ == "__main__":
    asyncio.run(main())