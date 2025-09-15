<script lang="ts">
  export let padding: 'sm' | 'md' | 'lg' = 'md';
  export let hover = false;
  export let clickable = false;
  
  $: classes = [
    'bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200',
    {
      'p-4': padding === 'sm',
      'p-6': padding === 'md',
      'p-8': padding === 'lg',
      'hover:shadow-xl hover:scale-105': hover,
      'cursor-pointer hover:shadow-xl hover:scale-105': clickable,
    }
  ].filter(Boolean).join(' ');
</script>

<div class={classes}>
  <slot />
</div>
