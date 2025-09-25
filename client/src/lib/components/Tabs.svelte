<script lang="ts">
  import Icon from './SimpleIcon.svelte';
  interface Tab { id: string; label: string; icon?: string; href?: string }
  interface Props { tabs: Tab[]; activeId?: string; onChange?: (id: string) => void; }

  let { tabs, activeId = undefined, onChange = undefined }: Props = $props();
  let current = $state(activeId || (tabs && tabs[0]?.id));

  $effect(() => { if (activeId && activeId !== current) current = activeId; });

  function select(id: string, href?: string) {
    current = id;
    onChange && onChange(id);
    if (href) location.href = href;
  }
</script>

<nav class="tabs" role="tablist">
  {#each tabs as t}
    <button
      class="tab"
      role="tab"
      aria-selected={current === t.id}
      aria-controls={`panel-${t.id}`}
      on:click={() => select(t.id, t.href)}
    >
      {#if t.icon}
        <Icon name={t.icon} size={16} />
      {/if}
      <span>{t.label}</span>
      <span class="indicator" aria-hidden="true"></span>
    </button>
  {/each}
</nav>

<style>
  .tabs {
    display: flex; gap: .5rem; border-bottom: 1px solid var(--border);
  }
  .tab {
    position: relative; appearance: none; background: transparent; border: 0; padding: .75rem 1rem; border-radius: 12px 12px 0 0;
    color: var(--fg-secondary); font-weight: 600; cursor: pointer;
  }
  .tab[aria-selected="true"] { color: var(--fg); }
  .tab:hover { background: var(--sidebar-item-hover); }
  .indicator { position: absolute; left: 0; bottom: -1px; height: 2px; width: 100%; background: transparent; border-radius: 2px; }
  .tab[aria-selected="true"] .indicator { background: var(--primary-600); }
</style>


