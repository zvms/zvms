<template>
  <v-card>
    <v-card-title>创建通知</v-card-title>
    <v-card-text>
      <v-form v-model="isFormValid">
        <v-table>
          <thead>
            <td>班级</td>
            <td></td>
          </thead>
          <tbody>
            <tr v-for="(userId, i) in userSelected" :key="i">
              <td>{{ mp[userId] }}</td>
              <td>
                <v-btn
                  class="mx-2"
                  fab
                  dark
                  x-small
                  color="primary"
                  @click="delFromList(i)"
                >
                  <v-icon dark> mdi-minus </v-icon>
                </v-btn>
              </td>
            </tr>
            <tr>
              <td>
                <v-select
                  prepend-icon="mdi-switch"
                  v-model="newTargetUser"
                  label="发送目标"
                  :items="targetUsers"
                  item-text="name"
                  item-value="id"
                >
                </v-select>
              </td>
              <td>
                <v-btn
                  class="mx-2"
                  fab
                  dark
                  x-small
                  color="primary"
                  @click="addToList"
                >
                  <v-icon dark> mdi-plus </v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-text-field
          v-model="form.title"
          label="标题"
          :rules="rules"
        ></v-text-field>
        <v-textarea
          v-model="form.message"
          :auto-grow="true"
          label="要发送的消息"
          :rules="rules"
        ></v-textarea>
      </v-form>
      <v-dialog
        ref="dateDialog"
        v-model="modalDate"
        v-model:return-value="form.date"
        persistent
        width="290px"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-text-field
            v-model="form.date"
            label="通知到期日期（默认持续三天）"
            prepend-icon="mdi-calendar"
            readonly
            v-bind="attrs"
            v-on="on"
          ></v-text-field>
        </template>
        <v-date-picker v-model="form.date" scrollable>
          <v-spacer></v-spacer>
          <v-btn text color="primary" @click="modalDate = false"> 取消 </v-btn>
          <v-btn text color="primary" @click="$refs.dateDialog.save(form.date)">
            确认
          </v-btn>
        </v-date-picker>
      </v-dialog>
      <v-card-actions>
        <v-btn color="primary" block @click="send">发送消息</v-btn>
      </v-card-actions>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { toasts } from "@/utils/dialogs";
import { fApi } from "@/apis";
import { NOTEMPTY } from "@/utils/validation";
import {} from "@/stores";
import { mapStores } from "pinia";

export default {
  data() {
    return {
      form: {
        title: "",
        message: "",
        date: "",
      },
      targetUsers: [] as string[],
      newTargetUser: "",
      userSelected: [] as { id: string }[],
      mp: {} as Record<string, string>,
      modalDate: false,
      rules: [NOTEMPTY()],
      isFormValid: false,
    };
  },
  computed: {
    ...mapStores(),
  },
  mounted() {
    this.pageload();
  },
  methods: {
    async pageload() {
      fApi.listClasses()((users) => {
        this.targetUsers = users;
        for (const cls of this.targetUsers) this.mp[cls.id] = cls.name;
      });
    },
    addToList() {
      let flg = false;
      if (this.newTargetUser == "") flg = true;
      for (const user of this.userSelected) {
        if (user["id"] == this.newTargetUser) {
          flg = true;
          break;
        }
      }
      if (!flg) this.userSelected.push(this.newTargetUser);
      this.newTargetUser = "";
    },
    delFromList(i) {
      this.userSelected.splice(i, 1);
    },
    send() {
      if (!this.userSelected || this.userSelected.length == 0) {
        toasts.error("请选择发送目标");
        return;
      }

      if (!this.form.date) {
        const d = new Date();
        this.form.date =
          d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + (d.getDate() + 2);
      }

      fApi.sendNotice(
        this.userSelected,
        this.form.title,
        this.form.date,
        this.form.message
      )((result) => {
        for (let k in this.form) this.form[k] = undefined;
        this.userSelected = [];
      });
    },
  },
};
</script>
