function formatDateRange(task) {
  const start = task.startDate || "-";
  const due = task.dueDate || "-";
  return `Start: ${start} · Due: ${due}`;
}

export function showSyncModal(dom, localInfo, cloudInfo) {
  return new Promise((resolve) => {
    if (!dom.syncModalBackdrop) {
      resolve({ action: "local" });
      return;
    }

    dom.syncLocalSummary.textContent =
      `${localInfo.count} tasks, ${localInfo.completed} completed` +
      ` · Updated ${localInfo.latestLabel}`;
    dom.syncCloudSummary.textContent =
      `${cloudInfo.count} tasks, ${cloudInfo.completed} completed` +
      ` · Updated ${cloudInfo.latestLabel}`;

    dom.syncModalBackdrop.classList.remove("hidden");
    dom.syncModalBackdrop.setAttribute("aria-hidden", "false");

    const cleanup = () => {
      dom.syncModalBackdrop.classList.add("hidden");
      dom.syncModalBackdrop.setAttribute("aria-hidden", "true");
      dom.syncKeepLocal.onclick = null;
      dom.syncUseCloud.onclick = null;
      dom.syncMerge.onclick = null;
    };

    dom.syncKeepLocal.onclick = () => {
      cleanup();
      resolve({ action: "local" });
    };
    dom.syncUseCloud.onclick = () => {
      cleanup();
      resolve({ action: "cloud" });
    };
    dom.syncMerge.onclick = () => {
      cleanup();
      resolve({ action: "merge" });
    };
  });
}

export function showMergeModal(dom, conflicts) {
  return new Promise((resolve) => {
    if (!dom.mergeModalBackdrop || !dom.mergeList) {
      resolve(null);
      return;
    }

    dom.mergeList.innerHTML = "";
    conflicts.forEach((conflict, index) => {
      const item = document.createElement("div");
      item.className = "merge-item";
      item.innerHTML = `
        <div class="merge-title">${conflict.name}</div>
        <div class="merge-options">
          <label class="merge-option">
            <input type="radio" name="merge-${index}" value="local" ${conflict.defaultChoice === "local" ? "checked" : ""} />
            <div>Keep local</div>
            <div class="merge-meta">${formatDateRange(conflict.local)}</div>
          </label>
          <label class="merge-option">
            <input type="radio" name="merge-${index}" value="cloud" ${conflict.defaultChoice === "cloud" ? "checked" : ""} />
            <div>Keep cloud</div>
            <div class="merge-meta">${formatDateRange(conflict.cloud)}</div>
          </label>
        </div>
      `;
      dom.mergeList.appendChild(item);
    });

    dom.mergeModalBackdrop.classList.remove("hidden");
    dom.mergeModalBackdrop.setAttribute("aria-hidden", "false");

    const cleanup = () => {
      dom.mergeModalBackdrop.classList.add("hidden");
      dom.mergeModalBackdrop.setAttribute("aria-hidden", "true");
      dom.mergeApply.onclick = null;
      dom.mergeCancel.onclick = null;
      dom.mergeClose.onclick = null;
    };

    const cancel = () => {
      cleanup();
      resolve(null);
    };

    dom.mergeCancel.onclick = cancel;
    dom.mergeClose.onclick = cancel;
    dom.mergeApply.onclick = () => {
      const selections = conflicts.map((conflict, idx) => {
        const selected = dom.mergeList.querySelector(
          `input[name="merge-${idx}"]:checked`
        );
        return {
          id: conflict.id,
          choice: selected ? selected.value : conflict.defaultChoice
        };
      });
      cleanup();
      resolve(selections);
    };
  });
}

export async function resolveSyncConflict(dom, localTasks, cloudTasks, localInfo, cloudInfo) {
  const choice = await showSyncModal(dom, localInfo, cloudInfo);
  if (choice.action !== "merge") {
    return { action: choice.action };
  }

  const localMap = new Map(localTasks.map((task) => [task.id, task]));
  const cloudMap = new Map(cloudTasks.map((task) => [task.id, task]));
  const merged = [];
  const conflicts = [];

  const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);
  allIds.forEach((id) => {
    const local = localMap.get(id);
    const cloud = cloudMap.get(id);
    if (local && cloud) {
      const datesMatch =
        (local.startDate || null) === (cloud.startDate || null) &&
        (local.dueDate || null) === (cloud.dueDate || null);
      if (datesMatch) {
        const localStamp = local.updatedAt || local.createdAt || 0;
        const cloudStamp = cloud.updatedAt || cloud.createdAt || 0;
        merged.push(localStamp >= cloudStamp ? local : cloud);
      } else {
        const localStamp = local.updatedAt || local.createdAt || 0;
        const cloudStamp = cloud.updatedAt || cloud.createdAt || 0;
        conflicts.push({
          id,
          name: local.name || cloud.name,
          local,
          cloud,
          defaultChoice: localStamp >= cloudStamp ? "local" : "cloud"
        });
      }
    } else if (local) {
      merged.push(local);
    } else if (cloud) {
      merged.push(cloud);
    }
  });

  if (conflicts.length === 0) {
    return { action: "merge", mergedTasks: merged };
  }

  const selections = await showMergeModal(dom, conflicts);
  if (!selections) {
    return { action: "local" };
  }

  selections.forEach((selection) => {
    const conflict = conflicts.find((item) => item.id === selection.id);
    if (!conflict) {
      return;
    }
    merged.push(selection.choice === "cloud" ? conflict.cloud : conflict.local);
  });

  return { action: "merge", mergedTasks: merged };
}
