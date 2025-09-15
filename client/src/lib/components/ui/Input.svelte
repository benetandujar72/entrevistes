<script lang="ts">
  export let value: string = '';
  export let type: string = 'text';
  export let placeholder: string = '';
  export let disabled = false;
  export let required = false;
  export let error: string | undefined = undefined;
  export let label: string | undefined = undefined;
  
  $: classes = [
    'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200',
    {
      'border-gray-300 dark:border-gray-600': !error,
      'border-red-500 dark:border-red-400': error,
      'opacity-50 cursor-not-allowed': disabled,
    }
  ].filter(Boolean).join(' ');
</script>

<div class="space-y-1">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}
  
  <input
    {type}
    {placeholder}
    {disabled}
    {required}
    bind:value
    class={classes}
  />
  
  {#if error}
    <p class="text-sm text-red-600 dark:text-red-400">{error}</p>
  {/if}
</div>
