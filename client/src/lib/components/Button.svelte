<script lang="ts">
  import Icon from './SimpleIcon.svelte';

  type Variant = 'filled' | 'tonal' | 'outlined' | 'text';
  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    variant?: Variant;
    size?: Size;
    color?: 'primary' | 'secondary' | 'surface' | 'danger';
    disabled?: boolean;
    loading?: boolean;
    leadingIcon?: string;
    trailingIcon?: string;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
    href?: string;
    target?: string;
    rel?: string;
  }

  let {
    variant = 'filled',
    size = 'md',
    color = 'primary',
    disabled = false,
    loading = false,
    leadingIcon = undefined,
    trailingIcon = undefined,
    type = 'button',
    className = '',
    href = undefined,
    target = undefined,
    rel = undefined
  }: Props = $props();

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  const sizeClass: Record<Size, string> = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  };

  let classes = $derived(() => {
    const base = 'btn';
    const v = `btn-${variant}-${color}`;
    const s = sizeClass[size];
    const state = disabled || loading ? 'btn-disabled' : '';
    return `${base} ${v} ${s} ${state} ${className}`.trim();
  });

  function handleClick(event: MouseEvent) {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    dispatch('click', event);
  }
</script>

{#if href}
  <a href={href} target={target} rel={rel} class={classes()} aria-busy={loading} aria-disabled={disabled || loading} on:click={handleClick}>
    {#if loading}
      <span class="spinner" aria-hidden="true"></span>
    {:else if leadingIcon}
      <Icon name={leadingIcon} size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />
    {/if}
    <slot />
    {#if trailingIcon && !loading}
      <Icon name={trailingIcon} size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />
    {/if}
    <span class="focus-ring" aria-hidden="true"></span>
  </a>
{:else}
  <button {type} class={classes()} disabled={disabled || loading} aria-busy={loading} on:click={handleClick}>
    {#if loading}
      <span class="spinner" aria-hidden="true"></span>
    {:else if leadingIcon}
      <Icon name={leadingIcon} size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />
    {/if}
    <slot />
    {#if trailingIcon && !loading}
      <Icon name={trailingIcon} size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />
    {/if}
    <span class="focus-ring" aria-hidden="true"></span>
    <span class="ripple" aria-hidden="true"></span>
  </button>
{/if}

<style>
  .btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 12px;
    font-weight: 600;
    line-height: 1;
    transition: background-color .15s ease, color .15s ease, border-color .15s ease, box-shadow .15s ease, transform .05s ease;
    border: 1px solid transparent;
    cursor: pointer;
    user-select: none;
  }

  .btn-sm { padding: 0.5rem 0.75rem; font-size: 0.875rem; }
  .btn-md { padding: 0.625rem 1rem; font-size: 0.95rem; }
  .btn-lg { padding: 0.8rem 1.25rem; font-size: 1rem; }

  /* Variantes color (Material-like) */
  .btn-filled-primary { background: var(--primary-600); color: white; }
  .btn-filled-primary:hover { background: var(--primary-700); box-shadow: var(--shadow-sm); }

  .btn-tonal-primary { background: var(--primary-50); color: var(--primary-700); border-color: var(--primary-100); }
  .btn-tonal-primary:hover { background: var(--primary-100); }

  .btn-outlined-primary { background: transparent; color: var(--primary-700); border-color: var(--primary-300); }
  .btn-outlined-primary:hover { background: var(--primary-50); }

  .btn-text-primary { background: transparent; color: var(--primary-700); }
  .btn-text-primary:hover { background: var(--primary-50); }

  .btn-disabled, .btn[aria-disabled="true"] { opacity: .6; cursor: not-allowed; pointer-events: none; }

  .spinner {
    width: 1rem; height: 1rem; border-radius: 999px; border: 2px solid rgba(255,255,255,.6); border-top-color: white; animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .focus-ring { position: absolute; inset: -2px; border-radius: inherit; outline: 3px solid transparent; pointer-events: none; }
  button:focus-visible .focus-ring { outline-color: rgba(33,150,243,.35); }
</style>


