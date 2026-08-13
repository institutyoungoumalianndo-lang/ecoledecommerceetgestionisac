import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserInputSchema,
  type CreateUserInput,
  type PublicUser,
  type RoleDto,
  type UpdateUserInput,
  updateUserInputSchema,
} from "@isac-erp/shared";
import { AtSign, Briefcase, Lock, Phone, ShieldCheck, User, UserPlus } from "lucide-react";
import { Button, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { useForm } from "react-hook-form";

export interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingUser: PublicUser | null;
  roles: RoleDto[];
  onCreate: (values: CreateUserInput) => void;
  onUpdate: (values: UpdateUserInput) => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

/**
 * Formulaire de création OU d'édition. Deux formulaires react-hook-form
 * distincts (plutôt qu'un seul générique) : leurs champs diffèrent
 * (mot de passe/nom d'utilisateur à la création seulement) et TypeScript ne
 * peut pas unifier proprement deux `UseFormRegister` de formes différentes.
 */
export function UserFormDialog(props: UserFormDialogProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.editingUser ? "Modifier l'utilisateur" : "Créer un utilisateur"}
      icon={props.editingUser ? <User size={18} /> : <UserPlus size={18} />}
    >
      {props.editingUser ? (
        <EditUserForm {...props} editingUser={props.editingUser} />
      ) : (
        <CreateUserForm {...props} />
      )}
    </Dialog>
  );
}

function CreateUserForm({ roles, onCreate, onClose, isSubmitting, errorMessage }: UserFormDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserInputSchema),
    mode: "onBlur",
    defaultValues: { firstName: "", lastName: "", username: "", roleId: roles[0]?.id ?? "", password: "" },
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onCreate)}>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Prénom" required error={errors.firstName?.message}>
          <Input icon={User} placeholder="Aïssatou" {...register("firstName")} />
        </FormField>
        <FormField label="Nom" required error={errors.lastName?.message}>
          <Input icon={User} placeholder="Diallo" {...register("lastName")} />
        </FormField>
      </div>

      <FormField label="Nom d'utilisateur" required error={errors.username?.message} hint="Au moins 3 caractères.">
        <Input icon={User} placeholder="a.diallo" {...register("username")} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="E-mail" error={errors.email?.message}>
          <Input icon={AtSign} type="email" placeholder="a.diallo@isac.edu.gn" {...register("email")} />
        </FormField>
        <FormField label="Téléphone" error={errors.phone?.message}>
          <Input icon={Phone} placeholder="+224 6XX XX XX XX" {...register("phone")} />
        </FormField>
      </div>

      <FormField label="Fonction" error={errors.jobTitle?.message}>
        <Input icon={Briefcase} placeholder="Comptable, Surveillant général…" {...register("jobTitle")} />
      </FormField>

      <FormField label="Rôle" required error={errors.roleId?.message}>
        <Select icon={ShieldCheck} {...register("roleId")}>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Mot de passe" required error={errors.password?.message}>
        <Input icon={Lock} type="password" placeholder="••••••••" {...register("password")} />
      </FormField>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function EditUserForm({
  editingUser,
  roles,
  onUpdate,
  onClose,
  isSubmitting,
  errorMessage,
}: UserFormDialogProps & { editingUser: PublicUser }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserInputSchema),
    mode: "onBlur",
    defaultValues: {
      id: editingUser.id,
      firstName: editingUser.firstName,
      lastName: editingUser.lastName,
      email: editingUser.email ?? undefined,
      phone: editingUser.phone ?? undefined,
      jobTitle: editingUser.jobTitle ?? undefined,
      roleId: editingUser.role?.id,
    },
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onUpdate)}>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Prénom" required error={errors.firstName?.message}>
          <Input icon={User} {...register("firstName")} />
        </FormField>
        <FormField label="Nom" required error={errors.lastName?.message}>
          <Input icon={User} {...register("lastName")} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="E-mail" error={errors.email?.message}>
          <Input icon={AtSign} type="email" {...register("email")} />
        </FormField>
        <FormField label="Téléphone" error={errors.phone?.message}>
          <Input icon={Phone} {...register("phone")} />
        </FormField>
      </div>

      <FormField label="Fonction" error={errors.jobTitle?.message}>
        <Input icon={Briefcase} {...register("jobTitle")} />
      </FormField>

      <FormField label="Rôle" required error={errors.roleId?.message}>
        <Select icon={ShieldCheck} {...register("roleId")}>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </Select>
      </FormField>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
