<script lang="ts">
  export let variant: 'primary' | 'success' | 'warning' | 'error' | 'info' = 'primary';
  export let size: 'sm' | 'md' = 'md';
  
  $: classes = [
    'inline-flex items-center font-medium rounded-full',
    {
      // Variants
      'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200': variant === 'primary',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': variant === 'success',
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': variant === 'warning',
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': variant === 'error',
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200': variant === 'info',
      
      // Sizes
      'px-2 py-0.5 text-xs': size === 'sm',
      'px-2.5 py-0.5 text-sm': size === 'md',
    }
  ].filter(Boolean).join(' ');
</script>

<span class={classes}>
  <slot />
</span>
