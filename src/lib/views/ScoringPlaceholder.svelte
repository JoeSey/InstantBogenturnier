<script lang="ts">
  import { Target } from '@lucide/svelte';
  import PlaceholderScreen from '../components/PlaceholderScreen.svelte';
  import { strings } from '../i18n/strings.de';
</script>

<PlaceholderScreen
  icon={Target}
  heading={strings.placeholder.heading(strings.nav.scoring)}
  body={strings.placeholder.body}
/>
