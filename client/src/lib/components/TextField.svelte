<script lang="ts">
  import Icon from './SimpleIcon.svelte';
  interface Props {
    label?: string; value?: string; type?: string; placeholder?: string; helper?: string; error?: string; disabled?: boolean; required?: boolean; leadingIcon?: string; trailingIcon?: string; name?: string; id?: string; autocomplete?: string; oninput?: (e: any) => void;
  }
  let { label = '', value = $bindable(''), type = 'text', placeholder = '', helper = '', error = '', disabled = false, required = false, leadingIcon, trailingIcon, name, id, autocomplete = 'off', oninput }: Props = $props();
  let focused = $state(false);
  let inputId = $derived(id || `tf-${Math.random().toString(36).slice(2,9)}`);
</script>

<label class="tf" data-error={!!error} data-disabled={disabled} for={inputId}>
  <div class="container">
    {#if leadingIcon}
      <Icon name={leadingIcon} size={18} />
    {/if}
    <div class="field">
      <input
        {type}
        {name}
        id={inputId}
        bind:value
        {placeholder}
        {disabled}
        {required}
        {autocomplete}
        on:focus={() => focused = true}
        on:blur={() => focused = false}
        on:input={oninput}
        aria-invalid={!!error}
        aria-describedby={helper ? `${inputId}-help` : undefined}
      />
      {#if label}
        <span class="label" class:raised={focused || value}>{label}{required ? ' *' : ''}</span>
      {/if}
    </div>
    {#if trailingIcon}
      <Icon name={trailingIcon} size={18} />
    {/if}
  </div>
  {#if helper || error}
    <div class="assist" id={`${inputId}-help`}>{error || helper}</div>
  {/if}
</label>

<style>
  .tf { display: block; }
  .container { display: flex; align-items: center; gap: .5rem; border: 1px solid var(--input-border); background: var(--input-bg); border-radius: 12px; padding: .65rem .75rem; position: relative; }
  .tf[data-error="true"] .container { border-color: var(--error-500); }
  .tf[data-disabled="true"] .container { opacity: .6; }

  .field { position: relative; flex: 1; }
  input { width: 100%; border: 0; outline: none; background: transparent; color: var(--fg); font-size: .95rem; padding: .25rem 0; }
  .label { position: absolute; left: 0; top: .55rem; color: var(--fg-secondary); transition: transform .15s ease, color .15s ease, font-size .15s ease; pointer-events: none; background: var(--input-bg); padding: 0 .25rem; z-index: 1; line-height: 1; }
  .label.raised { transform: translateY(-1.15rem); font-size: .75rem; color: var(--fg-secondary); background: var(--input-bg); z-index: 2; }
  .container:focus-within { box-shadow: 0 0 0 3px var(--input-ring); border-color: var(--input-border-focus); }
  .assist { margin-top: .25rem; font-size: .8rem; color: var(--fg-secondary); }
  .tf[data-error="true"] .assist { color: var(--error-600); }
</style>


