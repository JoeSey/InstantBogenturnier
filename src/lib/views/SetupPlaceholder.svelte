<script lang="ts">
  import { Settings2 } from '@lucide/svelte';
  import PlaceholderScreen from '../components/PlaceholderScreen.svelte';
  import { strings } from '../i18n/strings.de';
</script>

<PlaceholderScreen
  icon={Settings2}
  heading={strings.placeholder.heading(strings.nav.setup)}
  body={strings.placeholder.body}
/>
