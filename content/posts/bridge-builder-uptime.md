---
title: "Your uptime SLA means nothing when the physical process can't wait for your rollback"
date: 2026-06-02
draft: false
tags: ["ot", "it", "reliability", "bridge-builder"]
categories: ["bridge-builder"]
description: "Web developers think about uptime in terms of response times and error rates. In industrial systems, the cost of downtime is measured in something else entirely."
keywords: ["OT reliability", "SCADA uptime", "industrial systems", "IT/OT", "uptime SLA"]
summary: "Web developers think about uptime differently than industrial engineers. Here's why, and what it costs when you don't understand the difference."
---

There's a conversation that happens when IT developers first encounter operational technology. It usually goes something like this:

"What's your uptime requirement?"

"99.9%."

"That's about 8 hours of downtime per year. We can work with that."

"No, 99.9% *per shift*. We run 24/7. And if the system goes down mid-batch, we lose the entire batch."

The IT developer nods, makes a note, and quietly recalculates.

## What uptime means in IT

In web services, uptime is a statistical measure. Your load balancer distributes traffic. A rolling deployment takes down one instance at a time. If a deploy goes wrong, you roll back. The user retries their request. Maybe they see an error page for a few seconds.

99.9% uptime means roughly 8.7 hours of downtime per year. For most web applications, that's acceptable. For the unlucky users who hit those 8.7 hours, it's annoying but not catastrophic.

The whole model assumes the system's state is recoverable. A failed transaction gets retried. A dropped connection reconnects. Deployments are reversible.

## What uptime means in OT

In industrial control systems, "the system" is not the software. It's the physical process the software controls.

A water treatment plant doesn't pause while you roll back a SCADA update. A cement kiln running at 1400°C doesn't wait for your deployment pipeline. A paper machine running at 1000 meters per minute doesn't retry when your historian goes offline.

The physical process continues whether the software is healthy or not. And if the software loses control of the process, even briefly, the consequences are measured in:

- Batches scrapped
- Equipment damaged by running outside safe parameters
- Product out of spec that must be discarded
- In the worst cases: fires, injuries, environmental incidents

Your 8.7 hours of acceptable downtime might span three production batches. That's not an SLA problem. That's a business continuity problem.

## The rollback problem

Web developers treat rollbacks as a safety net. Something went wrong in production? Roll back to the last good version. Worst case, you lose a few minutes of data.

In industrial systems, rollback is often not an option mid-process.

If a PLC program update goes wrong mid-batch, you can't simply restore the previous version and continue. The physical state of the process has changed. Temperatures, pressures, chemical compositions are now different from what the previous version expected. Restoring old software to a new physical state can be more dangerous than finishing the bad deploy.

This is why industrial systems have change management processes that look bureaucratic and slow to IT eyes: planned maintenance windows, tested rollback procedures, operator sign-offs. They're not bureaucracy for its own sake. They're built around the reality that the software controls something that doesn't stop.

## What to do about it

If you're writing software that talks to industrial systems, a few things are worth internalising:

**Graceful degradation looks different here.** In web services, graceful degradation means showing a cached page or a friendly error. In OT, it means the control system continuing to operate safely in manual mode while your software is down. Design for that hand-off explicitly.

**Test against the physical constraints, not just the software ones.** What happens to your system when the network drops for 30 seconds? What does the PLC do? What does the operator see? What alarms trigger?

**Understand the process before you touch it.** The operators who run the plant know things about failure modes that aren't in any documentation. Talk to them before you write a line of code.

The SLA number on the contract is the easy part. Understanding what it actually means for the thing being controlled is the hard part.
