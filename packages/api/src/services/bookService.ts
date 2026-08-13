import { prisma, type Prisma } from "@isac-erp/db";
import type {
  BookCopyDto,
  BookDto,
  CreateBookCopyInput,
  CreateBookInput,
  ListBooksInput,
  UpdateBookInput,
  WithdrawBookCopyInput,
} from "@isac-erp/shared";
import { generateNumber } from "./matriculeService.js";

const bookInclude = {
  category: true,
  copies: { select: { status: true } },
} satisfies Prisma.BookInclude;

type BookWithRelations = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

function toBookDto(book: BookWithRelations): BookDto {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    categoryId: book.categoryId,
    categoryName: book.category.name,
    description: book.description,
    publisher: book.publisher,
    publicationYear: book.publicationYear,
    isbn: book.isbn,
    copyCount: book.copies.length,
    availableCopyCount: book.copies.filter((c) => c.status === "DISPONIBLE").length,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

const bookCopyInclude = { book: true } satisfies Prisma.BookCopyInclude;
type BookCopyWithRelations = Prisma.BookCopyGetPayload<{ include: typeof bookCopyInclude }>;

function toBookCopyDto(copy: BookCopyWithRelations): BookCopyDto {
  return {
    id: copy.id,
    inventoryNumber: copy.inventoryNumber,
    bookId: copy.bookId,
    bookTitle: copy.book.title,
    condition: copy.condition,
    status: copy.status,
    withdrawalReason: copy.withdrawalReason,
    createdAt: copy.createdAt,
    updatedAt: copy.updatedAt,
  };
}

export async function listBooks(input: ListBooksInput): Promise<BookDto[]> {
  const where: Prisma.BookWhereInput = {
    categoryId: input.categoryId,
    ...(input.search
      ? {
          OR: [
            { title: { contains: input.search, mode: "insensitive" } },
            { author: { contains: input.search, mode: "insensitive" } },
            { isbn: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const books = await prisma.book.findMany({ where, include: bookInclude, orderBy: { title: "asc" } });
  return books.map(toBookDto);
}

export async function getBook(id: string): Promise<BookDto> {
  const book = await prisma.book.findUniqueOrThrow({ where: { id }, include: bookInclude });
  return toBookDto(book);
}

export async function createBook(input: CreateBookInput): Promise<BookDto> {
  const book = await prisma.book.create({
    data: {
      title: input.title,
      author: input.author ?? null,
      categoryId: input.categoryId,
      description: input.description ?? null,
      publisher: input.publisher ?? null,
      publicationYear: input.publicationYear ?? null,
      isbn: input.isbn ?? null,
    },
    include: bookInclude,
  });
  return toBookDto(book);
}

export async function updateBook(input: UpdateBookInput): Promise<BookDto> {
  const book = await prisma.book.update({
    where: { id: input.id },
    data: {
      title: input.title,
      author: input.author === undefined ? undefined : input.author,
      categoryId: input.categoryId,
      description: input.description === undefined ? undefined : input.description,
      publisher: input.publisher === undefined ? undefined : input.publisher,
      publicationYear: input.publicationYear === undefined ? undefined : input.publicationYear,
      isbn: input.isbn === undefined ? undefined : input.isbn,
    },
    include: bookInclude,
  });
  return toBookDto(book);
}

export async function listBookCopies(bookId: string): Promise<BookCopyDto[]> {
  const copies = await prisma.bookCopy.findMany({
    where: { bookId },
    include: bookCopyInclude,
    orderBy: { createdAt: "desc" },
  });
  return copies.map(toBookCopyDto);
}

export async function createBookCopy(input: CreateBookCopyInput): Promise<BookCopyDto> {
  const copy = await prisma.$transaction(async (tx) => {
    const inventoryNumber = await generateNumber(tx, "EXEMPLAIRE_BIBLIOTHEQUE", {});
    return tx.bookCopy.create({
      data: { inventoryNumber, bookId: input.bookId, condition: input.condition },
      include: bookCopyInclude,
    });
  });
  return toBookCopyDto(copy);
}

/** Retrait/perte d'un exemplaire (MODULE-13 §1.3) — jamais une suppression physique. */
export async function withdrawBookCopy(input: WithdrawBookCopyInput): Promise<BookCopyDto> {
  const copy = await prisma.bookCopy.update({
    where: { id: input.id },
    data: { status: input.status, withdrawalReason: input.reason },
    include: bookCopyInclude,
  });
  return toBookCopyDto(copy);
}
