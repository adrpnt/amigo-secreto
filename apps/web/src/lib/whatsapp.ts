// Conversa nova no WhatsApp com o convite já escrito.
export function whatsappShareUrl(groupName: string, link: string): string {
  const text = `Vamos fazer amigo secreto! Entre no grupo ${groupName}: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
