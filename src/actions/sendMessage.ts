"use server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export default async function sendMessage({
  message,
  toUserId,
}: {
  message: string;
  toUserId: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("You must be logged in to send a message");
  }

  const createdMessage = await prisma.message.create({
    data: {
      message,
      toUserId,
      sentAt: new Date(),
      fromUserId: user.id,
    },
    include: {
      fromUser: true,
      toUser: true,
    },
  });

  const twoWayChannel = `messagesFrom-${user.id}-to-${toUserId}`;
  const oneWayChannel = `messagesTo-${toUserId}`;

  await pusherServer.trigger(twoWayChannel, "newMessage", createdMessage);
  await pusherServer.trigger(oneWayChannel, "newMessage", createdMessage);

  // Not revalidating the path here because it's not a static page
  return createdMessage;
}

export type SendMessageResponse = Awaited<ReturnType<typeof sendMessage>>;
