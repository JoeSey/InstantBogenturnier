<script lang="ts">
  import { Trophy } from '@lucide/svelte';
  import PlaceholderScreen from '../components/PlaceholderScreen.svelte';
  import { strings } from '../i18n/strings.de';
</script>

<PlaceholderScreen
  icon={Trophy}
  heading={strings.placeholder.heading(strings.nav.results)}
  body={strings.placeholder.body}
/>
